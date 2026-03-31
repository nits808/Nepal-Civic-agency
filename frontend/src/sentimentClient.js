// Client-side sentiment fallback (mirrors backend sentiment.js)
// Used when backend is offline

const LEXICON = {
  'corruption':-4,'bribery':-4,'flood':-4,'earthquake':-5,'landslide':-4,
  'killed':-5,'dead':-5,'injured':-4,'missing':-3,'disaster':-3,
  'protest':-2,'strike':-2,'scandal':-3,'unemployment':-3,'poverty':-3,
  'inflation':-3,'recession':-4,'deficit':-2,'crime':-3,'violence':-4,
  'epidemic':-4,'outbreak':-4,'pollution':-3,'deforestation':-4,
  'corruption':-4,'embezzlement':-4,'nepotism':-3,
  'GDP growth':+4,'investment':+3,'inaugurated':+3,'completed':+3,
  'launched':+2,'approved':+2,'scholarship':+3,'vaccine':+3,
  'reform':+2,'transparency':+3,'peace':+3,'agreement':+2,
  'hydropower':+3,'export growth':+3,'remittance':+2,'achievement':+3,
  'successful':+3,'milestone':+3,'historic':+2,'breakthrough':+3,
  'conservation':+3,'afforestation':+3,'clean energy':+4,
};

const CAT_BIAS = {
  disaster:-1.5, law:-0.5, health:-0.3, environment:-0.5,
  infrastructure:+0.5, tourism:+0.8, sports:+0.5, technology:+0.3,
};

function scoreOne(article) {
  const text = `${article.title||''} ${article.description||''}`.toLowerCase();
  let raw = 0, count = 0, signals = [];
  for (const [phrase, w] of Object.entries(LEXICON)) {
    if (text.includes(phrase)) { raw += w; count++; signals.push({ phrase, weight: w }); }
  }
  raw += (CAT_BIAS[article.category] || 0);
  const score = Math.max(-100, Math.min(100, count > 0 ? (raw / count) * 25 : 0));
  const label = score>=30?{label:'Very Positive',emoji:'🟢',color:'#10b981'}:
                score>=10?{label:'Positive',emoji:'🟡',color:'#84cc16'}:
                score>=-10?{label:'Neutral',emoji:'⚪',color:'#94a3b8'}:
                score>=-30?{label:'Negative',emoji:'🟠',color:'#f59e0b'}:
                           {label:'Very Negative',emoji:'🔴',color:'#ef4444'};
  return { score: Math.round(score), ...label, impact: Math.min(100, Math.abs(raw)*10), matchCount: count, topSignals: signals.slice(0,5), rawScore: raw };
}

export function computeSentimentReport(articles) {
  if (!articles?.length) return { overall:0, label:{label:'No Data',emoji:'⚪'}, totalArticles:0, byCategory:{}, byProvince:{}, trend:[], topNegative:[], topPositive:[], generatedAt:new Date().toISOString() };
  const scored = articles.map(a => ({ ...a, sentiment: scoreOne(a) }));
  let wSum=0, wTot=0;
  for (const a of scored) {
    const ageH = (Date.now()-new Date(a.date||0).getTime())/3600000;
    const w = Math.max(0.2, 1-ageH/72);
    wSum += a.sentiment.score*w; wTot += w;
  }
  const overall = wTot>0 ? Math.round(wSum/wTot) : 0;
  const byCategory={}, byProvince={};
  for (const a of scored) {
    const c=a.category||'politics', p=a.province||'National';
    if(!byCategory[c]) byCategory[c]={scores:[],count:0};
    if(!byProvince[p])  byProvince[p]={scores:[],count:0};
    byCategory[c].scores.push(a.sentiment.score); byCategory[c].count++;
    byProvince[p].scores.push(a.sentiment.score);  byProvince[p].count++;
  }
  const avg = arr=>Math.round(arr.reduce((s,v)=>s+v,0)/arr.length);
  const lbl = s=>s>=30?{label:'Very Positive',emoji:'🟢',color:'#10b981'}:s>=10?{label:'Positive',emoji:'🟡',color:'#84cc16'}:s>=-10?{label:'Neutral',emoji:'⚪',color:'#94a3b8'}:s>=-30?{label:'Negative',emoji:'🟠',color:'#f59e0b'}:{label:'Very Negative',emoji:'🔴',color:'#ef4444'};
  for (const k of Object.keys(byCategory)) { byCategory[k].avg=avg(byCategory[k].scores); byCategory[k].sentiment=lbl(byCategory[k].avg); delete byCategory[k].scores; }
  for (const k of Object.keys(byProvince))  { byProvince[k].avg=avg(byProvince[k].scores);   byProvince[k].sentiment=lbl(byProvince[k].avg);   delete byProvince[k].scores; }
  const byImpact=[...scored].sort((a,b)=>b.sentiment.impact-a.sentiment.impact);
  const topPositive=byImpact.filter(a=>a.sentiment.score>10).slice(0,5);
  const topNegative=byImpact.filter(a=>a.sentiment.score<-10).slice(0,5);
  const trend=[];
  return { overall, label:lbl(overall), totalArticles:articles.length, byCategory, byProvince, trend, topPositive, topNegative, topKeywords:[], generatedAt:new Date().toISOString() };
}
