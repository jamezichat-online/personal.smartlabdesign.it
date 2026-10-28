export const DEFAULT_TEXT = 'CREATIVE\nFORCE.';
const segmenter = new Intl.Segmenter(undefined, {granularity:'grapheme'});
export function specimenLines(raw) {
  const clean=String(raw??'').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,' ').split(/\r?\n/).slice(0,2).map(s=>s.replace(/\s+/g,' ').trim()).join('\n').trim();
  if(!clean)return DEFAULT_TEXT.split('\n');
  return [...segmenter.segment(clean)].slice(0,48).map(s=>s.segment).join('').split('\n');
}
export function safeMagnification(value) { const n=Number(value);return Number.isFinite(n)?Math.max(1.2,Math.min(2.2,n)):1.5; }
export function lensRadius(diameter,width,height) {return Math.max(16,Math.min(Number(diameter)/2,Math.min(width,height)/2-10));}
