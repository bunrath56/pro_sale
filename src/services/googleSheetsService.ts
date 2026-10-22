/**
 * Google Sheets Database Engine for Master IT School Sales Tracker
 * Fast Local-First / Cache-Backed Architecture with Single-Roundtrip Batching
 * Supports: Google OAuth REST API, Google Apps Script Web App (No-OAuth), and Direct Sheet Links
 */

import { SalesStore, DailyRecord, User, LeadSource, SecurityAuditLog } from '../types/sales';

export interface SheetDatabaseInfo {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  lastSyncedAt?: string;
  webAppUrl?: string; // Optional Google Apps Script sync endpoint (No OAuth needed!)
  connectionType?: 'oauth' | 'webapp' | 'link';
}

export type SyncState = 'disconnected' | 'idle' | 'syncing' | 'synced' | 'error';

const SPREADSHEET_TITLE = 'Master IT School - Sales Database';
const STORAGE_KEY_SHEET_INFO = 'masterit_google_sheet_info';

/**
 * Retrieve cached spreadsheet connection metadata
 */
export function getStoredSheetInfo(): SheetDatabaseInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHEET_INFO);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored sheet info', e);
  }
  return null;
}

export function saveStoredSheetInfo(info: SheetDatabaseInfo | null) {
  if (info) {
    localStorage.setItem(STORAGE_KEY_SHEET_INFO, JSON.stringify(info));
  } else {
    localStorage.removeItem(STORAGE_KEY_SHEET_INFO);
  }
}

/**
 * Parse Google Spreadsheet ID from either a full URL or a raw ID string
 */
export function parseSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Connect using a direct Google Spreadsheet URL or ID
 */
export function connectViaSpreadsheetUrl(
  urlOrId: string,
  customName?: string,
  webAppUrl?: string
): SheetDatabaseInfo {
  const sheetId = parseSpreadsheetId(urlOrId);
  const info: SheetDatabaseInfo = {
    spreadsheetId: sheetId,
    spreadsheetName: customName?.trim() || SPREADSHEET_TITLE,
    spreadsheetUrl: urlOrId.startsWith('http')
      ? urlOrId.trim()
      : `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    connectionType: webAppUrl?.trim() ? 'webapp' : 'link',
    webAppUrl: webAppUrl?.trim() || undefined,
    lastSyncedAt: new Date().toISOString(),
  };
  saveStoredSheetInfo(info);
  return info;
}

/**
 * Ensure that the target Google Spreadsheet has all required tabs and column headers:
 * - DailySales
 * - LeadSources
 * - Users
 * - AuditLogs
 */
export async function ensureSpreadsheetSchema(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Fetch current sheets metadata
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers }
  );

  if (!metaRes.ok) {
    if (metaRes.status === 403) {
      throw new Error(
        'គ្មានសិទ្ធិបើកមើល Google Sheet នេះទេ (Permission Denied)។ សូមប្រាកដថា Google Sheet ត្រូវបាន Share សិទ្ធិ Editor ទៅគណនី Google របស់អ្នក ឬអ្នកគឺជាម្ចាស់ Sheet។'
      );
    }
    if (metaRes.status === 404) {
      throw new Error('រកមិនឃើញ Google Sheet តាម ID នេះទេ (Not Found)។ សូមពិនិត្យ ID ឬ URL ម្តងទៀត។');
    }
    const errText = await metaRes.text();
    throw new Error(`មិនអាចទាក់ទង Google Sheets API: ${errText}`);
  }

  const metaData = await metaRes.json();
  const existingSheets = metaData.sheets || [];
  const existingTitles = existingSheets.map((s: any) => s.properties?.title);

  const requiredSheets = ['DailySales', 'LeadSources', 'Users', 'AuditLogs'];
  const missingSheets = requiredSheets.filter((title) => !existingTitles.includes(title));

  const requests: any[] = [];

  // If DailySales is missing and "Sheet1" exists, rename "Sheet1" -> "DailySales"
  let renamedSheet1 = false;
  if (missingSheets.includes('DailySales') && existingTitles.includes('Sheet1')) {
    const sheet1Obj = existingSheets.find((s: any) => s.properties?.title === 'Sheet1');
    if (sheet1Obj) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheet1Obj.properties.sheetId,
            title: 'DailySales',
            gridProperties: { frozenRowCount: 1 },
          },
          fields: 'title,gridProperties.frozenRowCount',
        },
      });
      renamedSheet1 = true;
    }
  }

  // Add any other missing sheets
  missingSheets.forEach((title) => {
    if (title === 'DailySales' && renamedSheet1) return;
    requests.push({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    });
  });

  // Execute sheet creation/renaming if needed
  if (requests.length > 0) {
    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ requests }),
      }
    );
    if (!batchRes.ok) {
      console.warn('Batch update sheet creation warning:', await batchRes.text());
    }
  }

  // Ensure header rows are written to all sheets
  const headerData = [
    {
      range: 'DailySales!A1:I1',
      values: [
        [
          'Date',
          'SellerID',
          'SellerName',
          'UpdatedAt',
          'TotalWon',
          'TotalRevenue',
          'TotalLeads',
          'TotalActs',
          'RawRecordJSON',
        ],
      ],
    },
    {
      range: 'LeadSources!A1:G1',
      values: [
        [
          'SourceID',
          'Name',
          'TargetWon',
          'TargetLeads',
          'DailyTargetWon',
          'DailyTargetLeads',
          'IsCustom',
        ],
      ],
    },
    {
      range: 'Users!A1:K1',
      values: [
        [
          'UserID',
          'Name',
          'Email',
          'Role',
          'Phone',
          'Active',
          'TargetWon',
          'TargetRevenue',
          'PasswordSalt',
          'PasswordHash',
          'CreatedAt',
        ],
      ],
    },
    {
      range: 'AuditLogs!A1:G1',
      values: [
        [
          'Timestamp',
          'Action',
          'ActorName',
          'ActorRole',
          'Target',
          'Severity',
          'Details',
        ],
      ],
    },
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerData,
      }),
    }
  );
}

/**
 * Copy-pasteable Google Apps Script for automated 2-way sync without OAuth
 */
export function getAppsScriptTemplate(): string {
  return `/**
 * Master IT Sales Tracker - Google Sheets Sync Web App
 * Paste this in Google Sheets > Extensions > Apps Script
 * Click Deploy > New Deployment > Web App (Execute as: Me, Who has access: Anyone)
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dbSheet = ss.getSheetByName('AppDatabase');
  if (!dbSheet) {
    return ContentService.createTextOutput(JSON.stringify({ salesStore: {} })).setMimeType(ContentService.MimeType.JSON);
  }
  var rawJson = dbSheet.getRange('A1').getValue();
  return ContentService.createTextOutput(rawJson || JSON.stringify({})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload = JSON.parse(e.postData.contents);
  
  // 1. Store Full JSON Snapshot
  var dbSheet = ss.getSheetByName('AppDatabase');
  if (!dbSheet) {
    dbSheet = ss.insertSheet('AppDatabase');
    dbSheet.hideSheet();
  }
  dbSheet.getRange('A1').setValue(JSON.stringify(payload));

  // 2. Write Human-Readable DailySales Sheet
  var salesSheet = ss.getSheetByName('DailySales');
  if (!salesSheet) {
    salesSheet = ss.insertSheet('DailySales');
    salesSheet.appendRow(['Date', 'SellerID', 'SellerName', 'UpdatedAt', 'TotalWon', 'TotalRevenue', 'TotalLeads', 'TotalActs']);
    salesSheet.setFrozenRows(1);
  }
  
  if (salesSheet.getLastRow() > 1) {
    salesSheet.getRange(2, 1, salesSheet.getLastRow() - 1, salesSheet.getLastColumn()).clearContent();
  }

  var sales = payload.salesStore || {};
  var rows = [];
  for (var k in sales) {
    var r = sales[k];
    var won = 0, rev = 0, leads = 0, acts = 0;
    for (var prop in r) {
      if (prop.slice(-2) === '_w') won += Number(r[prop]) || 0;
      if (prop.slice(-2) === '_r') rev += Number(r[prop]) || 0;
      if (prop.slice(-2) === '_l') leads += Number(r[prop]) || 0;
      if (prop.slice(-2) === '_a') acts += Number(r[prop]) || 0;
    }
    rows.push([r.date, r.sellerId, r.sellerName || '', r.updatedAt || '', won, rev, leads, acts]);
  }

  if (rows.length > 0) {
    salesSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', updated: rows.length })).setMimeType(ContentService.MimeType.JSON);
}`;
}

/**
 * Format sales data into CSV string for instant import in Google Sheets
 */
export function exportSalesToCsv(salesStore: SalesStore): string {
  const headers = [
    'Date',
    'Seller ID',
    'Seller Name',
    'Total Won',
    'Total Revenue ($)',
    'Total Leads',
    'Total Acts',
    'Updated At',
  ];

  const rows = Object.keys(salesStore).map((key) => {
    const r = salesStore[key];
    let won = 0;
    let rev = 0;
    let leads = 0;
    let acts = 0;

    Object.keys(r).forEach((p) => {
      if (p.endsWith('_w')) won += Number(r[p]) || 0;
      if (p.endsWith('_r')) rev += Number(r[p]) || 0;
      if (p.endsWith('_l')) leads += Number(r[p]) || 0;
      if (p.endsWith('_a')) acts += Number(r[p]) || 0;
    });

    return [
      `"${r.date}"`,
      `"${r.sellerId}"`,
      `"${(r.sellerName || '').replace(/"/g, '""')}"`,
      won,
      rev,
      leads,
      acts,
      `"${r.updatedAt || ''}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger browser download of CSV file
 */
export function downloadSalesCsv(salesStore: SalesStore): void {
  const csv = exportSalesToCsv(salesStore);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MasterIT_Sales_Export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy sales data formatted as TSV to clipboard (ready for instant Ctrl+V into Google Sheets)
 */
export async function copySalesToClipboard(salesStore: SalesStore): Promise<boolean> {
  const headers = [
    'Date',
    'Seller ID',
    'Seller Name',
    'Total Won',
    'Total Revenue ($)',
    'Total Leads',
    'Total Acts',
    'Updated At',
  ];

  const rows = Object.keys(salesStore).map((key) => {
    const r = salesStore[key];
    let won = 0;
    let rev = 0;
    let leads = 0;
    let acts = 0;

    Object.keys(r).forEach((p) => {
      if (p.endsWith('_w')) won += Number(r[p]) || 0;
      if (p.endsWith('_r')) rev += Number(r[p]) || 0;
      if (p.endsWith('_l')) leads += Number(r[p]) || 0;
      if (p.endsWith('_a')) acts += Number(r[p]) || 0;
    });

    return [
      r.date,
      r.sellerId,
      r.sellerName || '',
      won,
      rev,
      leads,
      acts,
      r.updatedAt || '',
    ].join('\t');
  });

  const tsv = [headers.join('\t'), ...rows].join('\n');

  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (e) {
    console.error('Clipboard copy error:', e);
    return false;
  }
}

/**
 * Find or Create the Master IT School Sales Google Spreadsheet via OAuth
 */
export async function ensureSpreadsheet(accessToken: string): Promise<SheetDatabaseInfo> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Check if previously saved spreadsheet is accessible
  const existingInfo = getStoredSheetInfo();
  if (existingInfo?.spreadsheetId) {
    try {
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${existingInfo.spreadsheetId}?fields=spreadsheetId,properties.title`,
        { headers }
      );
      if (checkRes.ok) {
        await ensureSpreadsheetSchema(accessToken, existingInfo.spreadsheetId);
        return existingInfo;
      }
    } catch {
      // Continue to search or create
    }
  }

  // 2. Search user's Google Drive for existing spreadsheet
  try {
    const query = encodeURIComponent(
      `name = '${SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
      { headers }
    );

    if (driveRes.ok) {
      const driveData = await driveRes.json();
      if (driveData.files && driveData.files.length > 0) {
        const found = driveData.files[0];
        const info: SheetDatabaseInfo = {
          spreadsheetId: found.id,
          spreadsheetName: found.name,
          spreadsheetUrl:
            found.webViewLink || `https://docs.google.com/spreadsheets/d/${found.id}/edit`,
          connectionType: 'oauth',
        };
        await ensureSpreadsheetSchema(accessToken, found.id);
        saveStoredSheetInfo(info);
        return info;
      }
    }
  } catch (err) {
    console.warn('Drive search fallback to create:', err);
  }

  // 3. Create a brand new Google Spreadsheet
  const createPayload = {
    properties: {
      title: SPREADSHEET_TITLE,
    },
    sheets: [
      { properties: { title: 'DailySales', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'LeadSources', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Users', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'AuditLogs', gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers,
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize header rows
  await ensureSpreadsheetSchema(accessToken, spreadsheetId);

  const newInfo: SheetDatabaseInfo = {
    spreadsheetId,
    spreadsheetName: SPREADSHEET_TITLE,
    spreadsheetUrl,
    connectionType: 'oauth',
  };
  saveStoredSheetInfo(newInfo);
  return newInfo;
}

/**
 * Fast Single-Roundtrip Batch Read from Google Sheets
 */
export async function fetchAllFromGoogleSheets(
  accessToken: string | null,
  spreadsheetTarget: string | SheetDatabaseInfo
): Promise<{
  salesStore: SalesStore;
  sources: LeadSource[];
  users: User[];
  auditLogs: SecurityAuditLog[];
}> {
  const info =
    typeof spreadsheetTarget === 'string'
      ? getStoredSheetInfo()
      : spreadsheetTarget;
  const spreadsheetId =
    typeof spreadsheetTarget === 'string'
      ? spreadsheetTarget
      : spreadsheetTarget.spreadsheetId;

  // 1. If WebApp URL is configured, fetch directly from WebApp endpoint (No OAuth needed!)
  if (info?.webAppUrl) {
    const res = await fetch(`${info.webAppUrl}?action=fetch`);
    if (res.ok) {
      const data = await res.json();
      return {
        salesStore: data.salesStore || {},
        sources: data.sources || [],
        users: data.users || [],
        auditLogs: data.auditLogs || [],
      };
    }
  }

  // 2. Otherwise require access token for REST API
  if (!accessToken) {
    throw new Error('ត្រូវការ Google OAuth Token ឬ Web App Sync URL ដើម្បីទាញទិន្នន័យពី Google Sheets');
  }

  // Ensure tabs exist before batchGet
  try {
    await ensureSpreadsheetSchema(accessToken, spreadsheetId);
  } catch (e) {
    console.warn('Schema check warning in fetchAll:', e);
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  const ranges = [
    'DailySales!A2:I',
    'LeadSources!A2:G',
    'Users!A2:K',
    'AuditLogs!A2:G',
  ];

  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}&valueRenderOption=UNFORMATTED_VALUE`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 400) {
      // Empty or new spreadsheet
      return { salesStore: {}, sources: [], users: [], auditLogs: [] };
    }
    throw new Error(`Google Sheets batchGet failed with status ${res.status}`);
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  // Parse DailySales
  const salesRows = valueRanges[0]?.values || [];
  const salesStore: SalesStore = {};

  salesRows.forEach((row: any[]) => {
    if (!row || row.length === 0) return;
    const date = String(row[0] || '').trim();
    const sellerId = String(row[1] || '').trim();
    const sellerName = String(row[2] || '');
    const rawJson = row[8];

    if (!date || !sellerId) return;
    const key = `${date}__${sellerId}`;

    if (rawJson && typeof rawJson === 'string') {
      try {
        const parsed = JSON.parse(rawJson);
        salesStore[key] = {
          ...parsed,
          date,
          sellerId,
          sellerName: sellerName || parsed.sellerName,
        };
        return;
      } catch {
        // Fallback
      }
    }

    salesStore[key] = {
      date,
      sellerId,
      sellerName,
      updatedAt: String(row[3] || ''),
    };
  });

  // Parse LeadSources
  const sourceRows = valueRanges[1]?.values || [];
  const sources: LeadSource[] = sourceRows
    .map((row: any[]) => {
      if (!row || !row[0]) return null;
      return {
        id: String(row[0]),
        name: String(row[1] || ''),
        tgtW: Number(row[2]) || 0,
        tgtL: Number(row[3]) || 0,
        dtgtW: Number(row[4]) || 0,
        dtgtL: Number(row[5]) || 0,
        isCustom: row[6] === true || row[6] === 'TRUE' || row[6] === 'true',
      };
    })
    .filter(Boolean) as LeadSource[];

  // Parse Users
  const userRows = valueRanges[2]?.values || [];
  const users: User[] = userRows
    .map((row: any[]) => {
      if (!row || !row[0]) return null;
      return {
        id: String(row[0]),
        name: String(row[1] || ''),
        email: String(row[2] || ''),
        role: (row[3] as any) || 'seller',
        phone: row[4] ? String(row[4]) : undefined,
        active: row[5] === true || row[5] === 'TRUE' || row[5] === 'true' || row[5] === 1,
        targetWon: Number(row[6]) || 75,
        targetRevenue: Number(row[7]) || 33750,
        passwordSalt: row[8] ? String(row[8]) : undefined,
        passwordHash: row[9] ? String(row[9]) : undefined,
        createdAt: row[10] ? String(row[10]) : new Date().toISOString().split('T')[0],
      };
    })
    .filter(Boolean) as User[];

  // Parse AuditLogs
  const auditRows = valueRanges[3]?.values || [];
  const auditLogs: SecurityAuditLog[] = auditRows
    .map((row: any[], idx: number) => {
      if (!row || !row[0]) return null;
      return {
        id: `glog_${idx}_${Date.now()}`,
        timestamp: String(row[0]),
        action: (row[1] as any) || 'SETTINGS_UPDATED',
        actorId: 'google_sheet',
        actorName: String(row[2] || 'System'),
        actorRole: (row[3] as any) || 'system',
        target: row[4] ? String(row[4]) : undefined,
        severity: (row[5] as any) || 'info',
        details: String(row[6] || ''),
      };
    })
    .filter(Boolean) as SecurityAuditLog[];

  return { salesStore, sources, users, auditLogs };
}

/**
 * Fast Single-Roundtrip Batch Write of All Data to Google Sheets
 */
export async function syncAllToGoogleSheets(
  accessToken: string | null,
  spreadsheetTarget: string | SheetDatabaseInfo,
  salesStore: SalesStore,
  sources: LeadSource[],
  users: User[],
  auditLogs: SecurityAuditLog[]
): Promise<void> {
  const info =
    typeof spreadsheetTarget === 'string'
      ? getStoredSheetInfo()
      : spreadsheetTarget;
  const spreadsheetId =
    typeof spreadsheetTarget === 'string'
      ? spreadsheetTarget
      : spreadsheetTarget.spreadsheetId;

  // 1. If WebApp URL is configured, send directly to Google Apps Script Web App (No OAuth needed!)
  if (info?.webAppUrl) {
    try {
      await fetch(info.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'sync',
          salesStore,
          sources,
          users,
          auditLogs,
          timestamp: new Date().toISOString(),
        }),
      });
      return;
    } catch (err: any) {
      console.warn('WebApp sync exception:', err);
    }
  }

  // 2. Otherwise require OAuth access token
  if (!accessToken) {
    throw new Error('ត្រូវការ Google OAuth Token ឬ Web App Sync URL ដើម្បី Sync ទៅ Google Sheets');
  }

  // Always ensure tabs and schema exist before writing data
  await ensureSpreadsheetSchema(accessToken, spreadsheetId);

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Convert SalesStore to table rows
  const salesKeys = Object.keys(salesStore);
  const salesRows = salesKeys.map((k) => {
    const record = salesStore[k];
    let totalWon = 0;
    let totalRev = 0;
    let totalLeads = 0;
    let totalActs = 0;

    Object.keys(record).forEach((prop) => {
      if (prop.endsWith('_w')) totalWon += Number(record[prop]) || 0;
      if (prop.endsWith('_r')) totalRev += Number(record[prop]) || 0;
      if (prop.endsWith('_l')) totalLeads += Number(record[prop]) || 0;
      if (prop.endsWith('_a')) totalActs += Number(record[prop]) || 0;
    });

    return [
      record.date,
      record.sellerId,
      record.sellerName || '',
      record.updatedAt || new Date().toISOString(),
      totalWon,
      totalRev,
      totalLeads,
      totalActs,
      JSON.stringify(record),
    ];
  });

  // Convert Sources to rows
  const sourceRows = sources.map((s) => [
    s.id,
    s.name,
    s.tgtW,
    s.tgtL,
    s.dtgtW,
    s.dtgtL,
    Boolean(s.isCustom),
  ]);

  // Convert Users to rows
  const userRows = users.map((u) => [
    u.id,
    u.name,
    u.email,
    u.role,
    u.phone || '',
    u.active,
    u.targetWon || 75,
    u.targetRevenue || 33750,
    u.passwordSalt || '',
    u.passwordHash || '',
    u.createdAt || '',
  ]);

  // Convert AuditLogs to rows (last 200 records)
  const auditRows = auditLogs.slice(0, 200).map((l) => [
    l.timestamp,
    l.action,
    l.actorName,
    l.actorRole,
    l.target || '',
    l.severity,
    l.details,
  ]);

  // Clear existing rows safely
  const clearRanges = [
    'DailySales!A2:I1000',
    'LeadSources!A2:G100',
    'Users!A2:K100',
    'AuditLogs!A2:G500',
  ];

  await Promise.allSettled(
    clearRanges.map((r) =>
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          r
        )}:clear`,
        { method: 'POST', headers }
      )
    )
  );

  // Write new data in one batchUpdate
  const batchData = [
    {
      range: `DailySales!A2:I${Math.max(2, salesRows.length + 1)}`,
      values: salesRows.length > 0 ? salesRows : [['', '', '', '', '', '', '', '', '']],
    },
    {
      range: `LeadSources!A2:G${Math.max(2, sourceRows.length + 1)}`,
      values: sourceRows.length > 0 ? sourceRows : [['', '', '', '', '', '', '']],
    },
    {
      range: `Users!A2:K${Math.max(2, userRows.length + 1)}`,
      values: userRows.length > 0 ? userRows : [['', '', '', '', '', '', '', '', '', '', '']],
    },
    {
      range: `AuditLogs!A2:G${Math.max(2, auditRows.length + 1)}`,
      values: auditRows.length > 0 ? auditRows : [['', '', '', '', '', '', '']],
    },
  ];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!updateRes.ok) {
    if (updateRes.status === 403) {
      throw new Error(
        'គ្មានសិទ្ធិកែប្រែ Google Sheet នេះទេ (Permission Denied)។ សូមប្រាកដថាអ្នកបានចែករំលែកសិទ្ធិ Editor ទៅគណនី Google របស់អ្នក។'
      );
    }
    const errText = await updateRes.text();
    throw new Error(`បរាជ័យក្នុងការ Sync ទៅ Google Sheets: ${errText}`);
  }
}
