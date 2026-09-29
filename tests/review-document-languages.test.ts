import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/documents/templates";
import type { DocContext } from "@/documents/context";
import { requirementLibrary } from "@/domain/playbooks";

const context = (lang: DocContext['lang']): DocContext => ({
  lang, today: '2026-09-29', asAt: '2026-09-29', values: { transferDetails: 'TX-100', controllerDetails: 'CTRL-100' },
  task: { id: 'task-123', title: 'Record board meeting', params: {} }, pb: { id: 'hk.meetingMinutes' },
  client: { nameEn: 'Example Limited', nameTc: '示例有限公司', nameSc: '示例有限公司', companyNumber: '70000001' },
  firm: { legalName: 'Example Firm', legalNameZh: '示例事務所', address: '1 Fiction Road', tcspLicence: 'TC000001' },
  directors: [{personId:'p1', fromDate:'2020-01-01',person:{nameEn:'CHAN Example', correspondenceAddress:'2 Fiction Road'}}],
  members: [{personId:'p1',name:'CHAN Example',className:'Ordinary',quantity:100,percent:100}], capital:[], officers:[],
} as unknown as DocContext);
const ancillary = ['share-certificate', 'instrument-of-transfer', 'contract-notes', 'engagement-letter', 'scr-notice', 'register-directors', 'register-members'];
const boilerplate = (c: DocContext, id: string) => JSON.stringify(TEMPLATES[`tpl:${id}`](c));

describe('Document language follows the staff-selected output language', () => {
  for (const id of ancillary) {
    it(`${id} has no fixed Chinese boilerplate in English output`, () => {
      expect(boilerplate(context('en'),id)).not.toMatch(/[\u3400-\u9fff]/);
    });
    it(`${id} renders Simplified Chinese body text without fixed English boilerplate`, () => {
      const text = boilerplate(context('sc'),id);
      expect(text).not.toMatch(/This is to certify|Transfer details|The transferor|Stamp duty|Bought Note|Sold Note|Engagement letter|We are pleased|Under Part|Correspondence address|"Member"|"Class"|"Shares"|Director \/|Buyer \/|Seller \//);
      expect(text).not.toMatch(/登記|轉讓|買賣|單據|委託|服務|成員/);
    });
    it(`${id} renders both English and Traditional body text in bilingual output`, () => {
      const text = boilerplate(context('bilingual'),id);
      const en = boilerplate(context('en'),id);
      const tc = boilerplate(context('tc'),id);
      expect(text.length).toBeGreaterThan(en.length);
      expect(text.length).toBeGreaterThan(tc.length);
    });
  }
});

describe('Meeting minutes record supplied meeting facts, never an invented meeting', () => {
  const facts = { meetingDate:'2026-09-28',meetingTime:'14:30',meetingPlace:'Room 9',meetingChair:'CHAN Example',meetingAttendees:'CHAN Example; LEE Example',meetingDecisions:'The budget was deferred pending quotations.' };
  it('both editable template IDs exist and their meeting fields are reusable checklist requirements', () => {
    expect(TEMPLATES['tpl:board-meeting-minutes']).toBeTypeOf('function');
    expect(TEMPLATES['tpl:members-meeting-minutes']).toBeTypeOf('function');
    for (const key of Object.keys(facts)) expect(requirementLibrary()[key]).toMatchObject({kind:'data'});
  });
  it.each(Object.keys(facts))('minutes refuse missing %s instead of defaulting to today or the statutory officers', key => {
    const c=context('en'); c.values={...facts}; delete c.values[key];
    expect(TEMPLATES['tpl:board-meeting-minutes']).toBeTypeOf('function');
    expect(()=>TEMPLATES['tpl:board-meeting-minutes'](c)).toThrow(key);
  });
  it.each([['meetingDate','2026-02-30'],['meetingTime','25:30']])('minutes refuse invalid %s', (key,value)=>{
    const c=context('en'); c.values={...facts,[key]:value};
    expect(()=>TEMPLATES['tpl:board-meeting-minutes'](c)).toThrow(key);
  });
  it.each(['en','tc','sc','bilingual'] as const)('minutes preserve actual date, time, place, chair, attendees and decision in %s',lang=>{
    const c=context(lang);c.values={...facts};
    expect(TEMPLATES['tpl:board-meeting-minutes']).toBeTypeOf('function');
    const text=boilerplate(c,'board-meeting-minutes');
    for(const value of Object.values(facts).filter(v=>v!==facts.meetingDate)) expect(text).toContain(value);
    expect(text).not.toMatch(/unanimous|all directors|2026-09-29|一致|全體|全体/);
    expect(text).not.toContain('Written Resolutions');
  });
});
