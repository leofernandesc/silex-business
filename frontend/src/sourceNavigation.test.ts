import {it,expect} from 'vitest';
import {sourceId,sourceHref} from './sourceNavigation';
it('accepts only one positive internal source identifier',()=>{expect(sourceId('?source_id=17')).toBe(17);for(const value of ['', '?source_id=0','?source_id=-1','?source_id=abc','?source_id=1&source_id=2','?source_id=2147483648'])expect(sourceId(value)).toBeNull()});
it('never builds an external or unregistered source URL',()=>{expect(sourceHref({route:'sales',id:17})).toBe('/app?source_id=17#sales');for(const route of ['https://example.test','//example.test','users','missing'])expect(sourceHref({route,id:1})).toBe('/app#home')});
