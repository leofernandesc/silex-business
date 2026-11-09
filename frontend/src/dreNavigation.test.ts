import {it,expect} from 'vitest';
import {readDrePeriod,dreHref} from './dreNavigation';
it('preserves the explicitly applied economic period through reload',()=>{const p={start:'2026-11-01',end:'2026-11-08'};expect(readDrePeriod(new URL(dreHref(p),'http://localhost').search)).toEqual(p)});
it('rejects malformed and ambiguous DRE query dates',()=>{for(const query of ['dre_view=dre&dre_start=2026-02-30','dre_view=dre&dre_start=2026-12-01&dre_end=2026-01-01','dre_view=dre&dre_view=dre','dre_view=dre&dre_start=2026-01-01&dre_start=2026-02-01'])expect(readDrePeriod(query)).toBeNull()});
it('uses the supplied civil reference for a new DRE shortcut',()=>expect(readDrePeriod('dre_view=dre','2027-01-01')).toEqual({start:'2027-01-01',end:'2027-01-01'}));
