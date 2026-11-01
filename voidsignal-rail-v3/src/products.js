// Real VoidSignal catalogue. `src` = same-origin mockup (WebGL textures need CORS-clean pixels);
// back views are hot-linked from the Spreadshop CDN (plain <img>, no CORS needed).
export const SHOP={id:1590708,url:'https://voidsignal.myspreadshop.it',api:'https://api.spreadshirt.net/api/v1',locale:'it_IT',checkout:'https://checkout.spreadshirt.it/'};
export const SIZES=[{l:'XS',id:1},{l:'S',id:2},{l:'M',id:3},{l:'L',id:4},{l:'XL',id:5},{l:'XXL',id:6}];
export const TRIBE={stage:{name:'The Stage',cat:'Street Rock',c:'var(--v-sr)'},iron:{name:'The Iron',cat:'Gym',c:'var(--v-gym)'}};
const COLOR={2:'Black',742:'Anthracite',951:'India Ink Grey',1256:'Heather Anthracite'};
const FIT={812:'Premium organic cotton \u00b7 men\u2019s cut',635:'Organic cotton \u00b7 unisex cut'};
const CDN='https://image.spreadshirtmedia.net/image-server/v1/products/';
const raw=[
 {
  "name": "No Future",
  "tribe": "stage",
  "sellable": "rlt0l7bvc1x9-812",
  "appearance": 2,
  "type": 812,
  "path": "T812A2PA8515PT17X20Y30D360562346W34990H22293",
  "file": "VOID SIGNAL - No Future Street Rock.png",
  "page": "void+signal+no+future+street+rock-A326cd41f8b60cfbd",
  "src": "assets/tee-0.webp"
 },
 {
  "name": "Dead Air",
  "tribe": "stage",
  "sellable": "rlt0mll1d28z-812",
  "appearance": 2,
  "type": 812,
  "path": "T812A2PA8515PT17X20Y30D360562293W34990H26366",
  "file": "VOID SIGNAL - Dead Air Street Rock.png",
  "page": "void+signal+dead+air+street+rock-A326cd43903bc31a3",
  "src": "assets/tee-1.webp"
 },
 {
  "name": "Signal White",
  "tribe": "stage",
  "sellable": "rlt0mncxe0bp-812",
  "appearance": 2,
  "type": 812,
  "path": "T812A2PA8515PT17X20Y30D360562366W34990H40842",
  "file": "VOID SIGNAL - Signal White Street Rock.png",
  "page": "void+signal+signal+white+street+rock-A326cd439e9ff5a25",
  "src": "assets/tee-2.webp"
 },
 {
  "name": "Overdrive",
  "tribe": "stage",
  "sellable": "rlt0ne09c1ck-812",
  "appearance": 1256,
  "type": 812,
  "path": "T812A1256PA8515PT17X20Y30D360562294W34990H34990",
  "file": "VOID SIGNAL - Overdrive Street Rock.png",
  "page": "void+signal+overdrive+street+rock-A326cd4476b7ddad4",
  "src": "assets/tee-3.webp"
 },
 {
  "name": "Torn Signal",
  "tribe": "stage",
  "sellable": "rlt0nrz6i83t-812",
  "appearance": 1256,
  "type": 812,
  "path": "T812A1256PA8515PT17X20Y30D360562295W34990H29241",
  "file": "VOID SIGNAL - Torn Signal Street Rock.png",
  "page": "void+signal+torn+signal+street+rock-A326cd44e800d9b89",
  "src": "assets/tee-4.webp"
 },
 {
  "name": "Tribe",
  "tribe": "iron",
  "sellable": "rlt0pujbzmja-635",
  "appearance": 742,
  "type": 635,
  "path": "T635A742PA7544PT17X46Y30D360562372W18755H20174",
  "file": "VOID SIGNAL - Tribe Gym.png",
  "page": "void+signal+tribe+gym-A326cd47449e993d6",
  "src": "assets/tee-5.webp"
 },
 {
  "name": "Dynamic",
  "tribe": "iron",
  "sellable": "rlt0pyz1eopi-635",
  "appearance": 2,
  "type": 635,
  "path": "T635A2PA7544PT17X0Y30D360562374W27993H27698",
  "file": "VOID SIGNAL - Dynamic Gym.png",
  "page": "void+signal+dynamic+gym-A326cd4768980e196",
  "src": "assets/tee-6.webp"
 },
 {
  "name": "Core",
  "tribe": "iron",
  "sellable": "rlt0q4nzis9i-635",
  "appearance": 2,
  "type": 635,
  "path": "T635A2PA7544PT17X0Y30D360562375W27993H30111",
  "file": "VOID SIGNAL - Core Gym.png",
  "page": "void+signal+core+gym-A326cd4796c25de96",
  "src": "assets/tee-7.webp"
 },
 {
  "name": "Signal",
  "tribe": "stage",
  "sellable": "rlt0kxfr1vlx-635",
  "appearance": 951,
  "type": 635,
  "path": "T635A951PA7544PT17X3Y30D360562345W27363H31976",
  "file": "VOID SIGNAL - Signal Street Rock.png",
  "page": "void+signal+signal+street+rock-A326cd41a87e6fd45",
  "src": "assets/tee-8.webp"
 }
];
export const products=raw.map(p=>({...p,category:TRIBE[p.tribe].cat,color:COLOR[p.appearance],fit:FIT[p.type],url:`${SHOP.url}/${p.page}`,
  imageBack:`${CDN}${p.path}/views/2/${encodeURIComponent(p.file)}?width=900&height=900&appearanceId=${p.appearance}`}));
