export interface PrototypeEntry {
  id: string; title: string; appId: string; path: string;
  stack: string; designSystem: string; tags?: string[];
}
export const APP_BASE_URLS: Record<string,string> = {
  scaleui3: 'http://localhost:3000',
};
export const prototypes: PrototypeEntry[] = [
  { id:'falcon', title:'Project Falcon (ScaleUI3)', appId:'scaleui3', path:'/falcon',
    stack:'next-tw4', designSystem:'scaleui3', tags:['fleet','ops','deployments'] },
];
export function resolveUrl(e: PrototypeEntry){ return (APP_BASE_URLS[e.appId] ?? '') + e.path; }
