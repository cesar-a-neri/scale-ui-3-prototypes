export interface PrototypeEntry {
  id: string; title: string; appId: string; path: string;
  stack: string; designSystem: string; tags?: string[];
}
export const APP_BASE_URLS: Record<string,string> = {
  scaleui3: '',
};
export const prototypes: PrototypeEntry[] = [
  { id:'falcon', title:'Project Falcon', appId:'scaleui3', path:'/falcon',
    stack:'next-tw4', designSystem:'scaleui3', tags:['fleet','ops','deployments'] },
  { id:'sgp-nav', title:'SGP Navigation IA', appId:'scaleui3', path:'/sgp-nav',
    stack:'next-tw4', designSystem:'scaleui3', tags:['nav','navigation','ia','mega-menu'] },
  { id:'golden-agent', title:'Golden Agent', appId:'scaleui3', path:'/golden-agent',
    stack:'next-tw4', designSystem:'scaleui3', tags:['agents','ci','cd','builds','deploy'] },
];
export function resolveUrl(e: PrototypeEntry){ return (APP_BASE_URLS[e.appId] ?? '') + e.path; }
