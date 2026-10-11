import type {OfficeLayout,PlacedFurniture,TileType} from '../office/types.js';
import {ROSTER} from './roster.js';
import {getPlacementBlockedTiles} from '../office/layout/layoutSerializer.js';

export type Theme='studio'|'night'|'garden';
export const COZY_REVISION=118;
export function refineSavedLayout(layout:OfficeLayout):OfficeLayout{
 const printer=layout.furniture.find(f=>f.uid==='finance-printer');
 let furniture=layout.furniture;
 if(printer?.col===12&&printer.row===51){
  const moved={...printer,col:11,row:49};
  const occupied=getPlacementBlockedTiles(layout.furniture.filter(f=>f.uid!==printer.uid));
  if([...getPlacementBlockedTiles([moved])].every(tile=>!occupied.has(tile)))furniture=layout.furniture.map(f=>f.uid===printer.uid?moved:f);
 }
 // Upgrade only unchanged default visitor furniture, preserving owner edits.
 const defaults=[{uid:'ceo-sofa',col:5,row:11,type:'BB_SOFA',next:{type:'BB_ARMCHAIR',col:5,row:11}},{uid:'ceo-table',col:8,row:11,type:'BB_COFFEE_TABLE',next:{type:'BB_COFFEE_TABLE',col:7,row:11}},{uid:'ceo-chair',col:12,row:8,type:'BB_ARMCHAIR',next:{type:'BB_ARMCHAIR',col:9,row:11}}];
 if(layout.layoutRevision===116&&defaults.every(d=>furniture.some(f=>f.uid===d.uid&&f.type===d.type&&f.col===d.col&&f.row===d.row))){
  const proposed=furniture.map(f=>{const d=defaults.find(d=>d.uid===f.uid);return d?{...f,...d.next}:f;});
  const other=getPlacementBlockedTiles(furniture.filter(f=>!defaults.some(d=>d.uid===f.uid)));
  if([...getPlacementBlockedTiles(proposed.filter(f=>defaults.some(d=>d.uid===f.uid)))].every(tile=>!other.has(tile)))furniture=proposed;
 }
 if(layout.layoutRevision===117){
  const upgrades=[
   {old:[['studio-camera',8,28],['studio-light',13,27],['studio-chair',5,28]],next:[{uid:'studio-camera',type:'BB_CAMERA',col:10,row:29},{uid:'studio-light',type:'BB_SOFTBOX',col:7,row:27},{uid:'studio-chair',type:'BB_ARMCHAIR',col:10,row:27}]},
   {old:[['game-sofa',59,53],['game-table',62,53],['game-plant',71,51]],next:[{uid:'game-bench',type:'BB_BENCH',col:69,row:52}]},
  ];
  for(const group of upgrades){
   if(!group.old.every(([uid,col,row])=>furniture.some(f=>f.uid===uid&&f.col===col&&f.row===row)))continue;
   const remaining=furniture.filter(f=>!group.old.some(([uid])=>uid===f.uid));
   const occupied=getPlacementBlockedTiles(remaining);
   if(group.next.some(f=>remaining.some(old=>old.uid===f.uid))||[...getPlacementBlockedTiles(group.next)].some(tile=>occupied.has(tile)))continue;
   furniture=[...remaining,...group.next];
  }
 }
 return {...layout,furniture,layoutRevision:COZY_REVISION};
}
export const COZY_COLS=77,COZY_ROWS=77;
export interface Bounds {left:number;right:number;top:number;bottom:number}
export const BUILDING:Bounds={left:2,right:74,top:2,bottom:55};
export const CEO_ROOM:Bounds={left:3,right:16,top:3,bottom:15};
export const POND:Bounds={left:24,right:30,top:66,bottom:70};
export const HALL_HUB={col:37,row:34};
export interface CozyRoom extends Bounds {
 label:string;door:number;doorSide:'north'|'south'|'east'|'west';locked:boolean;color:string;
 outdoor?:boolean;floor?:'oak'|'studio'|'tile'|'slate'|'walnut';
 extraDoors?:Array<{side:'north'|'south'|'east'|'west';at:number}>;
}
// Indices are stable for existing room navigation. New work teams are appended.
export const COZY_ROOMS:CozyRoom[]=[
 {label:'Gökhan · CEO',...CEO_ROOM,door:12,doorSide:'south',locked:true,color:'#d7b575',floor:'walnut'},
 {label:'Kahve & kitap',left:3,right:18,top:36,bottom:46,door:41,doorSide:'east',locked:false,color:'#b3c99d'},
 {label:'Toplantı odası',left:21,right:36,top:36,bottom:46,door:42,doorSide:'west',locked:false,color:'#c9b896'},
 {label:'Ürün · Platform',left:21,right:36,top:3,bottom:15,door:28,doorSide:'south',locked:false,color:'#a9bca0'},
 {label:'İçerik stüdyosu',left:3,right:18,top:19,bottom:32,door:27,doorSide:'east',locked:false,color:'#dda58b',floor:'studio'},
 {label:'SEO · Teknik & veri',left:57,right:73,top:3,bottom:15,door:65,doorSide:'south',locked:false,color:'#9ebf9c'},
 {label:'Pazarlama',left:39,right:54,top:36,bottom:42,door:39,doorSide:'east',locked:false,color:'#c2a1b5'},
 {label:'Dinlenme salonu',left:57,right:73,top:19,bottom:25,door:22,doorSide:'west',locked:false,color:'#c6b38b'},
 {label:'Oyun odası',left:57,right:73,top:48,bottom:55,door:52,doorSide:'west',extraDoors:[{side:'south',at:66}],locked:false,color:'#b7a7c9',floor:'slate'},
 {label:'Bahçe · Teras',left:39,right:73,top:58,bottom:74,door:46,doorSide:'north',extraDoors:[{side:'north',at:66},{side:'west',at:67}],locked:false,color:'#8cbd83',outdoor:true},
 {label:'Giriş ve resepsiyon',left:39,right:54,top:44,bottom:55,door:52,doorSide:'north',extraDoors:[{side:'south',at:46}],locked:false,color:'#c9b896'},
 {label:'Mutfak ve yemek',left:57,right:73,top:36,bottom:46,door:43,doorSide:'west',locked:false,color:'#ccad8c',floor:'tile'},
 {label:'Satış',left:57,right:73,top:27,bottom:32,door:30,doorSide:'west',locked:false,color:'#c3b184'},
 {label:'Finans',left:3,right:18,top:48,bottom:55,door:52,doorSide:'east',locked:false,color:'#a8b7a2',floor:'walnut'},
 {label:'Muhasebe',left:21,right:36,top:48,bottom:55,door:52,doorSide:'east',locked:false,color:'#b2b7c9',floor:'walnut'},
 {label:'Ürün · Teslim & kalite',left:39,right:54,top:3,bottom:15,door:46,doorSide:'south',locked:false,color:'#adbfce'},
 {label:'SEO · İçerik',left:21,right:36,top:19,bottom:32,door:28,doorSide:'south',locked:false,color:'#d7bda2'},
 {label:'SEO · Arama & büyüme',left:39,right:54,top:19,bottom:32,door:46,doorSide:'south',locked:false,color:'#b3c5a5'},
 {label:'Bahçe · Koruluk',left:3,right:37,top:58,bottom:74,door:67,doorSide:'east',locked:false,color:'#76a06c',outdoor:true},
];
export const contains=(r:Bounds,col:number,row:number)=>col>=r.left&&col<=r.right&&row>=r.top&&row<=r.bottom;
export const insideCeo=(col:number,row:number)=>col>CEO_ROOM.left&&col<CEO_ROOM.right&&row>CEO_ROOM.top&&row<CEO_ROOM.bottom;
export const isIndoorGround=(col:number,row:number)=>contains(BUILDING,col,row);
export const EXTERIOR_APPROACHES=[{left:45,right:47,top:56,bottom:57},{left:65,right:67,top:56,bottom:57},{left:38,right:38,top:66,bottom:68}];
export const isBuildingGround=(col:number,row:number)=>isIndoorGround(col,row)||COZY_ROOMS.some(r=>r.outdoor&&contains(r,col,row))||EXTERIOR_APPROACHES.some(r=>contains(r,col,row));
export const CORRIDORS:Bounds[]=[
 {left:17,right:20,top:3,bottom:55},{left:37,right:38,top:3,bottom:55},{left:55,right:56,top:3,bottom:55},
 {left:3,right:73,top:16,bottom:18},{left:3,right:73,top:33,bottom:35},
 {left:3,right:36,top:47,bottom:47},{left:39,right:54,top:43,bottom:43},{left:57,right:73,top:26,bottom:26},{left:57,right:73,top:47,bottom:47},
];
export const isRoomDoor=(room:CozyRoom,col:number,row:number)=>!room.locked&&[{side:room.doorSide,at:room.door},...(room.extraDoors??[])].some(d=>(d.side==='north'||d.side==='south')?row===(d.side==='north'?room.top:room.bottom)&&Math.abs(col-d.at)<=1:col===(d.side==='west'?room.left:room.right)&&Math.abs(row-d.at)<=1);
export const SOCIAL_VISITS=[{col:10,row:39,label:'Kahve molası'},{col:64,row:23,label:'Dinleniyor'},{col:53,row:69,label:'Bahçede'},{col:66,row:52,label:'Oyun odasında'},{col:68,row:43,label:'Yemek molası'},{col:19,row:66,label:'Korulukta'}];
// Two straight walks share one straight promenade; the patio is not a route.
export const GARDEN_PAVING=[{col:45,row:58,w:3,h:11},{col:65,row:58,w:3,h:11},{col:32,row:66,w:36,h:3}];
export const GARDEN_TERRACE={col:51,row:64,w:10,h:10};
export const ROOM_WINDOWS:Record<number,number[]>={0:[5],3:[23],5:[59],15:[41]};
export const ROOM_RUGS=[
 {type:'BB_RUG_SAGE',col:4,row:6,w:8,h:5},
 {type:'BB_RUG_TERRA',col:48,row:47,w:6,h:7},
 {type:'BB_RUG_ROUND',col:58,row:20,w:10,h:5},
 {type:'BB_RUG_BLUE',col:4,row:39,w:7,h:6},
];
export const WORK_TEAMS=[
 {room:3,cols:[23,27,31],rows:[6,11],roles:['bibilen-senior-architect','database-designer','senior-backend','senior-fullstack','security-pen-testing','ui-design-system']},
 {room:15,cols:[41,45,49],rows:[6,11],roles:['flutter-mobile','web-frontend','gap-reviewer','release-manager','senior-qa','operations-reporter']},
 {room:5,cols:[59,63,67],rows:[6,11],roles:['seo-dataforseo','seo-drift','seo-performance','seo-schema','seo-sitemap','seo-technical']},
 {room:16,cols:[23,27,31],rows:[22,27],roles:['seo-cluster','seo-content','seo-flow','seo-geo','seo-image-gen','seo-visual']},
 {room:17,cols:[41,45,49],rows:[22,27],roles:['seo-backlinks','seo-ecommerce','seo-google','seo-local','seo-maps','seo-sxo']},
 {room:0,cols:[5],rows:[7],roles:['chief']},
 {room:4,cols:[5,11],rows:[23],roles:['remotion-producer','visual-content-producer']},
 {room:6,cols:[41],rows:[38],roles:['marketing-lead']},
 {room:13,cols:[5],rows:[50],roles:['finance-analyst']},
 {room:14,cols:[23],rows:[50],roles:['accounting-analyst']},
 {room:12,cols:[59],rows:[29],roles:['sales-lead']},
];
// Actual rear-facing art, mounted ON the wall, with one nonblocking wall row.
export const WALL_PLACEMENTS:Array<{uid:string;type:string;room:number;col:number;lift?:number}>=[
 {uid:'ceo-books',type:'BB_WALL_BOOKS',room:0,col:13},
 {uid:'platform-books',type:'BB_WALL_BOOKS',room:3,col:30},
 {uid:'platform-server',type:'BB_SERVER_RACK',room:3,col:34},
 {uid:'delivery-archive',type:'BB_ARCHIVE',room:15,col:50},
 {uid:'technical-server',type:'BB_SERVER_RACK',room:5,col:70},
 {uid:'content-books',type:'BB_WALL_BOOKS',room:16,col:32},
 {uid:'growth-archive',type:'BB_ARCHIVE',room:17,col:51},
 {uid:'studio-archive',type:'BB_ARCHIVE',room:4,col:14},
 {uid:'rest-books',type:'BB_WALL_BOOKS',room:7,col:70},
 {uid:'cafe-coffee',type:'BB_COFFEE_STATION',room:1,col:4},
 {uid:'cafe-books',type:'BB_WALL_BOOKS',room:1,col:14},
 {uid:'kitchen-sink',type:'BB_WALL_SINK',room:11,col:58},
 {uid:'kitchen-oven',type:'BB_WALL_OVEN',room:11,col:62},
 {uid:'kitchen-fridge',type:'BB_WALL_FRIDGE',room:11,col:68,lift:1},
 {uid:'kitchen-coffee',type:'BB_COFFEE_STATION',room:11,col:65},
 {uid:'finance-archive',type:'BB_ARCHIVE',room:13,col:14},
 {uid:'accounting-invoices',type:'BB_ARCHIVE',room:14,col:29},
 {uid:'accounting-archive',type:'BB_ARCHIVE',room:14,col:33},
 {uid:'sales-archive',type:'BB_ARCHIVE',room:12,col:70},
 {uid:'reception-books',type:'BB_WALL_BOOKS',room:10,col:48},
 {uid:'game-arcade',type:'BB_ARCADE',room:8,col:66},
 {uid:'game-arcade-b',type:'BB_ARCADE',room:8,col:69},
];

export function makeLayout(theme:Theme):OfficeLayout {
 const furniture:PlacedFurniture[]=[];
 const add=(uid:string,type:string,col:number,row:number)=>furniture.push({uid,type,col,row});
 const knownKeys=new Set(ROSTER.map(r=>r.key));
 const freeDesks=WORK_TEAMS.filter(t=>t.room!==0).flatMap(team=>team.roles.flatMap((key,i)=>knownKeys.has(key)?[]:[{col:team.cols[i%team.cols.length],row:team.rows[Math.floor(i/team.cols.length)]}]));
 for(const role of ROSTER){
  const team=WORK_TEAMS.find(t=>t.roles.includes(role.key));
  const i=team?.roles.indexOf(role.key)??-1;
  const place=team?{col:team.cols[i%team.cols.length],row:team.rows[Math.floor(i/team.cols.length)]}:freeDesks.shift();
  if(!place)continue; // Extra roles remain available without inventing overlapping desks.
  const {col,row}=place;
  const business=role.key==='finance-analyst'?'BB_FINANCE_DESK':role.key==='accounting-analyst'?'BB_LEDGER_DESK':role.key==='sales-lead'?'BB_SALES_DESK':null;
  add('desk-'+role.key,business??(role.key==='chief'?'BB_EXEC_DESK':role.group==='Video ve görsel'?'BB_STUDIO_DESK':'BB_WORK_DESK'),col,row);
  add('seat-'+role.key,business?'BB_EMBEDDED_SEAT':role.key==='chief'?'BB_EXEC_MODERN':'BB_OFFICE_BACK',col+(business&&role.key!=='sales-lead'?2:1),row+(business&&role.key!=='sales-lead'?3:2));
 }
 for(const mount of WALL_PLACEMENTS)add(mount.uid,mount.type,mount.col,COZY_ROOMS[mount.room].top-(mount.lift??0));
 for(const [uid,type,col,row] of [
  ['ceo-sofa','BB_ARMCHAIR',5,11],['ceo-table','BB_COFFEE_TABLE',7,11],['ceo-chair','BB_ARMCHAIR',9,11],['ceo-plant','BB_MONSTERA',13,11],
  ['platform-board','BB_WHITEBOARD',26,3],['delivery-board','BB_EDITORIAL_BOARD',45,3],
  ['technical-board','BB_ANALYTICS_BOARD',64,3],['content-board','BB_EDITORIAL_BOARD',26,19],['growth-map','BB_SEARCH_MAP',45,19],
  ['studio-board','BB_EDITORIAL_BOARD',6,19],['studio-camera','BB_CAMERA',10,29],['studio-light','BB_SOFTBOX',7,27],['studio-chair','BB_ARMCHAIR',10,27],
  ['marketing-board','BB_EDITORIAL_BOARD',49,36],['marketing-plant','BB_MONSTERA',52,39],
  ['rest-sofa','BB_SOFA',59,21],['rest-chair','BB_ARMCHAIR',65,21],['rest-table','BB_COFFEE_TABLE',62,22],['rest-plant','BB_FLOWERS',71,23],
  ['sales-board','BB_EDITORIAL_BOARD',59,27],['sales-visitor','BB_ARMCHAIR',65,29],['sales-table','BB_COFFEE_TABLE',67,29],['sales-flowers','BB_FLOWERS',71,30],
  ['cafe-sofa','BB_SOFA',4,40],['cafe-chair','BB_ARMCHAIR',8,40],['cafe-table','BB_COFFEE_TABLE',5,42],['cafe-board','BB_NOTICE',10,36],['cafe-plant','BB_MONSTERA',15,42],
  ['meeting-table','BB_MEETING_TABLE',24,39],['meeting-board','BB_WHITEBOARD',25,36],['meeting-plant','BB_TREE',33,42],
  ['meeting-a','BB_OFFICE_FRONT',24,38],['meeting-b','BB_OFFICE_FRONT',26,38],['meeting-c','BB_OFFICE_FRONT',28,38],
  ['meeting-d','BB_OFFICE_BACK',24,42],['meeting-e','BB_OFFICE_BACK',26,42],['meeting-f','BB_OFFICE_BACK',28,42],
  ['finance-chart','BB_FINANCE_CHART',8,48],['finance-printer','BB_PRINTER',11,49],
  ['accounting-board','BB_NOTICE',23,48],
  ['reception-counter','BB_COUNTER',41,46],['reception-sofa','BB_SOFA',49,48],['reception-chair','BB_ARMCHAIR',49,51],['reception-table','BB_COFFEE_TABLE',51,50],['reception-plant','BB_MONSTERA',52,52],['reception-coat','BB_COAT',40,51],
  ['dining-table','BB_DINING',63,41],['dining-a','BB_DINING_FRONT',64,40],['dining-b','BB_DINING_FRONT',66,40],['dining-c','BB_DINING_BACK',64,44],['dining-d','BB_DINING_BACK',66,44],
  ['game-pool','BB_POOL',59,50],['game-bench','BB_BENCH',69,52],
  // Woodland: clustered varied species, understory, shore and benches.
  ['grove-maple-a','BB_MAPLE',5,59],['grove-cherry-a','BB_CHERRY',8,58],['grove-maple-b','BB_MAPLE',12,60],['grove-pine-a','BB_PINE',17,58],['grove-cherry-b','BB_CHERRY',20,59],['grove-maple-c','BB_MAPLE',25,58],['grove-pine-b','BB_PINE',33,60],
  ['grove-bench-a','BB_BENCH',7,64],['grove-bench-b','BB_BENCH',16,64],['grove-beds-a','BB_FLOWERBED',22,64],
  ['grove-shrub-a','BB_SHRUB',5,65],['grove-shrub-b','BB_SHRUB',11,65],['grove-shrub-c','BB_SHRUB',33,64],['grove-beds-b','BB_FLOWERBED',4,67],['grove-beds-c','BB_FLOWERBED',14,66],
  ['grove-maple-d','BB_MAPLE',5,68],['grove-cherry-c','BB_CHERRY',12,68],['grove-maple-e','BB_MAPLE',19,68],['grove-cherry-d','BB_CHERRY',32,68],['grove-maple-f','BB_MAPLE',25,69],['grove-pine-c','BB_PINE',16,69],['grove-shrub-d','BB_SHRUB',9,70],['grove-shrub-e','BB_SHRUB',16,70],['grove-shrub-f','BB_SHRUB',21,66],['grove-lantern','BB_LANTERN',31,69],
  ['terrace-maple-a','BB_MAPLE',40,59],['terrace-cherry-a','BB_CHERRY',49,59],['terrace-maple-b','BB_MAPLE',58,59],['terrace-pine','BB_PINE',70,59],['terrace-cherry-b','BB_CHERRY',40,68],['terrace-maple-c','BB_MAPLE',68,68],['terrace-cherry-c','BB_CHERRY',54,58],['terrace-shrub-a','BB_SHRUB',43,62],['terrace-shrub-b','BB_SHRUB',61,71],
  ['terrace-bench-a','BB_BENCH',50,64],['terrace-bench-b','BB_BENCH',61,64],['terrace-beds-a','BB_FLOWERBED',54,60],['terrace-beds-b','BB_FLOWERBED',69,64],['terrace-planter-a','BB_GARDEN_PLANTER',40,64],['terrace-planter-b','BB_GARDEN_PLANTER',49,71],
  ['garden-table','BB_GARDEN_TABLE',55,70],['garden-chair-a','BB_DINING_FRONT',56,69],['garden-chair-b','BB_DINING_FRONT',58,69],['garden-chair-c','BB_DINING_BACK',56,73],['garden-chair-d','BB_DINING_BACK',58,73],['terrace-lamp-a','BB_LANTERN',49,69],['terrace-lamp-b','BB_LANTERN',63,69],
 ] as const)add(uid,type,col,row);
 if(theme==='garden')add('extra-flower','BB_FLOWERS',19,34);
 const tiles:TileType[]=[],areaTiles:Array<string|null>=[];
 for(let row=0;row<COZY_ROWS;row++)for(let col=0;col<COZY_COLS;col++){
  let tile:TileType=isBuildingGround(col,row)?1:255,label:string|null=null;
  for(const room of COZY_ROOMS)if(contains(room,col,row)){
   const edge=col===room.left||col===room.right||row===room.top||row===room.bottom;
   tile=edge&&!isRoomDoor(room,col,row)?0:1;label=tile===1?room.label:null;
  }
  if(contains(BUILDING,col,row)&&(col===BUILDING.left||col===BUILDING.right||row===BUILDING.top||row===BUILDING.bottom)){
   const exit=row===BUILDING.bottom&&[46,66].some(at=>Math.abs(col-at)<=1);tile=exit?1:0;
  }
  if(contains(POND,col,row))tile=0;
  tiles.push(tile);areaTiles.push(label);
 }
 return {version:1,cols:COZY_COLS,rows:COZY_ROWS,tiles,furniture,layoutRevision:COZY_REVISION,
  tileColors:tiles.map(t=>t===0?{h:38,s:25,b:25,c:0,colorize:true}:{h:34,s:35,b:15,c:0,colorize:true}),
  pets:[{id:'bibilen-mascot',petType:0}],areas:COZY_ROOMS.map(r=>({label:r.label,color:r.color})),areaTiles};
}
