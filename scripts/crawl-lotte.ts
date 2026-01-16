
import { chromium, Browser } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';

import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { LOTTE_LOCATIONS } from './data/cinema-locations';

dotenv.config({ path: '.env.local' });

// --- Configuration ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID!;

// Validate Env
const requiredVars = { SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID };
const missing = Object.entries(requiredVars).filter(([, value]) => !value).map(([key]) => key);
if (missing.length > 0) {
  console.error(`❌ Missing: ${missing.join(', ')}`);
  process.exit(1);
}

// --- Clients ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- Types ---
interface ScrapedEvent {
  title: string;
  detailUrl: string;
  dateRange?: string;
}

interface EnrichedEvent extends ScrapedEvent {
  movieTitle: string;
  goodsType: string;
  locations: string[];
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getExistingUrls(): Promise<Set<string>> {
  const { data, error } = await supabase.from('events').select('official_url');
  if (error) return new Set();
  return new Set((data as { official_url: string }[]).map((e) => e.official_url));
}

async function crawlLotteList(): Promise<ScrapedEvent[]> {
  console.log('Starting Playwright for Lotte Cinema (JSON mode)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const listUrl = 'https://www.lottecinema.co.kr/NLCHS/Event/DetailList?code=20';
  let capturedEvents: ScrapedEvent[] = [];

  try {
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('EventData.aspx')) {
        try {
          const text = await response.text();
          const data = JSON.parse(text);
          if (data && data.Items) {
            capturedEvents = data.Items.map((item: { EventName: string; ProgressStartDate: string; ProgressEndDate: string; EventID: string }) => ({
              title: item.EventName,
              dateRange: `${item.ProgressStartDate} ~ ${item.ProgressEndDate}`,
              detailUrl: `https://www.lottecinema.co.kr/NLCHS/Event/EventTemplateInfo?eventId=${item.EventID}`
            }));
          }
        } catch {}
      }
    });

    await page.goto(listUrl, { waitUntil: 'networkidle' });
    for (let i = 0; i < 15 && capturedEvents.length === 0; i++) await wait(1000);
    return capturedEvents;
  } catch (e) {
    console.error('Error in crawlLotteList:', e);
    return [];
  } finally {
    await browser.close();
  }
}

async function analyzeImageWithGemini(imagePath: string): Promise<{ movieTitle: string, goodsType: string, locations: string[] }> {
  let rawResponse = '';
  
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    const prompt = `
당신은 영화관 이벤트 페이지에서 정보를 추출하는 전문가입니다.
제공된 롯데시네마 이벤트 상세 페이지 이미지를 분석해주세요.

이미지에서 다음 정보를 정확히 추출해야 합니다:

1. "movieTitle" (영화 제목):
   - 특정 영화와 관련된 이벤트인 경우, 이미지에 표시된 정확한 영화 제목을 추출하세요.
   - 영화와 관련 없는 일반 이벤트인 경우 "General"을 사용하세요.
   - 예시: "글래디에이터 II", "위키드", "General"

2. "goodsType" (상품 종류):
   - 제공되는 상품의 종류를 추출하세요.
   - 가능한 값: "시그니처 아트카드", "포스터", "배지", "포스트카드", "스티커", "포토카드", "키링" 등
   - 여러 종류가 있으면 쉼표로 구분하여 결합하세요 (예: "시그니처 아트카드, 포스터")
   - 이미지에서 정확히 확인할 수 없는 경우 "Unknown"을 사용하세요.

3. "locations" (지점 정보):
   - 이벤트가 진행되는 지점을 추출하세요.
   - "전국", "전 지점", "모든 지점" 등의 표현이 있으면 ["All"]을 반환하세요.
   - 특정 지점이 나열되어 있으면 모든 지점을 배열로 추출하세요 (예: ["월드타워", "건대입구", "신림"]).
   - 지점 정보가 없는 경우 빈 배열 []을 반환하세요.

중요 사항:
- 이미지의 텍스트는 한국어입니다.
- 이미지를 자세히 살펴보고 모든 텍스트를 정확히 읽어주세요.
- 추출할 수 없는 정보는 빈 문자열("") 또는 빈 배열([])로 반환하세요.
- 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명이나 텍스트는 포함하지 마세요.

응답 형식 (JSON만):
{
  "movieTitle": "영화 제목 또는 General",
  "goodsType": "상품 종류",
  "locations": ["지점1", "지점2"] 또는 ["All"] 또는 []
}

/*
----------------------------------------
[지점 리스트 (참고용 Master Data)]
아래 리스트에 있는 지점명만 사용하세요. 없는 지점이나 오타를 생성하지 마세요.
${LOTTE_LOCATIONS.join(', ')}
----------------------------------------
*/

[분석 단계 (Chain of Thought)]
1. 이미지 내 텍스트를 모두 읽으세요.
2. '진행 지점'과 '제외 지점(진행하지 않는 지점, 미진행)'을 명확히 구분하세요. 특히 텍스트가 작게 적힌 '제외 지점' 목록을 주의하세요.
3. '제외 지점'에 포함된 곳은 절대 결과에 넣지 마세요.
4. 추출된 지점들을 위 [지점 리스트]와 대조하여 정확한 명칭으로 변환하세요.
5. 최종 JSON을 생성하세요.
`;

    console.log('🔍 Gemini 이미지 분석 시작...');

    const models = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash", 
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-pro"
    ];

    let result: any; // gemini-ai results are complex, 'any' is common or would need complex import
    let lastError: Error | undefined;

    modelLoop: for (const modelName of models) {
        console.log(`🤖 Trying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        let retries = 2;
        while (retries > 0) {
            try {
                result = await model.generateContent([
                    prompt,
                    { inlineData: { data: imageBase64, mimeType: "image/png" } }
                ]);
                break modelLoop;
            } catch (e: unknown) {
                const error = e as Error;
                lastError = error;
                if (error.message?.includes('429')) {
                    console.warn(`⏳ Rate Limit (429) on ${modelName}. Waiting 15s... (${retries} retries left)`);
                    await wait(15000);
                    retries--;
                } else {
                    console.warn(`⚠️ Error with ${modelName}: ${error.message}. Trying next...`);
                    retries--;
                }
            }
        }
    }
    
    if (!result) throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
    
    rawResponse = result.response.text();
    let cleanJson = rawResponse.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanJson = jsonMatch[0];
    
    const parsed = JSON.parse(cleanJson);
    
    const result_cleaned = {
      movieTitle: (parsed.movieTitle || '').trim() || '',
      goodsType: (parsed.goodsType || '').trim() || 'Unknown',
      locations: Array.isArray(parsed.locations) 
        ? (parsed.locations as unknown[]).filter((loc): loc is string => typeof loc === 'string' && loc.length > 0)
          .map((loc: string) => loc.trim()) 
        : []
    };
    console.log('✅ Gemini 분석 완료:', result_cleaned);
    return result_cleaned;
  } catch (e: unknown) {
    const error = e as Error;
    console.error('❌ Gemini 분석 실패:', error.message);
    return { movieTitle: '', goodsType: 'Unknown', locations: [] };
  }
}

async function saveToSheets(event: EnrichedEvent) {
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const headers = ['event_title', 'movie_title', 'goods_type', 'locations', 'period', 'detail_url', 'crawled_at'];
    try { await sheet.loadHeaderRow(); } catch { await sheet.setHeaderRow(headers); }
    await sheet.addRow({
      event_title: event.title,
      movie_title: event.movieTitle,
      goods_type: event.goodsType,
      locations: event.locations.join(', '),
      period: event.dateRange || '',
      detail_url: event.detailUrl,
      crawled_at: new Date().toISOString()
    });
    console.log(`✅ Google Sheet 저장 완료: ${event.title}`);
  } catch (e) { console.error('Sheet error:', e); }
}

async function saveToSupabase(event: EnrichedEvent) {
  const { error } = await supabase.from('events').insert({
    event_title: event.title,
    movie_title: event.movieTitle,
    cinema_id: 3, // Lotte
    goods_type: event.goodsType,
    period: event.dateRange,
    locations: event.locations,
    official_url: event.detailUrl,
    status: '예정',
    is_visible: false,
    is_new: true
  });
  if (error) console.error('Supabase error:', error);
  else console.log(`✅ Supabase 저장 완료: ${event.title}`);
}

async function processDetail(browser: Browser, url: string): Promise<string | null> {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 2000 });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await wait(2000);
    const imagesDir = path.join(__dirname, 'crawled_images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const screenshotPath = path.join(imagesDir, `lotte_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  } catch { return null; } finally { await page.close(); }
}

(async () => {
  console.log('🚀 Starting Test Crawler (Lotte)...');
  const existingUrls = await getExistingUrls();
  const allEvents = await crawlLotteList();
  
  const targetEvents = allEvents.filter(e => {
    // A. Keyword Filter
    const keywords = ['증정', '스페셜', '아트카드', '시그니처'];
    const hasKeyword = keywords.some(k => e.title.includes(k));
    if (!hasKeyword) return false;

    // B. Date Filter - Only process events that haven't ended yet
    if (e.dateRange && e.dateRange.includes('~')) {
      try {
        const [, endStr] = e.dateRange.split('~').map(s => s.trim());
        const parts = endStr.split('.');
        if (parts.length === 3) {
          const endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Skip events that have already ended
          if (endDate < today) {
            console.log(`   ⏭️  Skipping ended event: "${e.title}" (ended: ${endStr})`);
            return false;
          }
        }
      } catch {
        console.warn(`   ⚠️  Date parsing failed for "${e.title}": ${e.dateRange}`);
        // Continue processing if date parsing fails
      }
    }

    // C. DB Check
    return !existingUrls.has(e.detailUrl);
  });

  console.log(`Found ${targetEvents.length} events to process.`);
  const browser = await chromium.launch();
  for (const event of targetEvents) {
    console.log(`Processing: ${event.title}`);
    const screenshotPath = await processDetail(browser, event.detailUrl);
    if (!screenshotPath) continue;

    const analysis = await analyzeImageWithGemini(screenshotPath);
    await saveToSheets({ ...event, ...analysis });
    await saveToSupabase({ ...event, ...analysis });
    if (fs.existsSync(screenshotPath)) fs.unlinkSync(screenshotPath);
    await wait(3000);
  }
  await browser.close();
  console.log('Done.');
})();
