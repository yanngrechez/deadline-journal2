(function(root){
  const regionCodes={
    'Europe':'AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA'.split(' '),
    'Americas':'AG AR BS BB BZ BO BR CA CL CO CR CU DM DO EC SV GD GT GY HT HN JM MX NI PA PY PE KN LC VC SR TT US UY VE'.split(' '),
    'Middle East & North Africa':'DZ BH EG EH IR IQ IL JO KW LB LY MR MA OM PS QA SA SD SY TN TR AE YE'.split(' '),
    'Sub-Saharan Africa':'AO BJ BW BF BI CV CM CF TD KM CD CG CI DJ GQ ER SZ ET GA GM GH GN GW KE LS LR MG MW ML MU MZ NA NE NG RW ST SN SC SL SO ZA SS TZ TG UG ZM ZW'.split(' '),
    'Asia-Pacific':'AF AM AZ AU BD BT BN KH CN FJ GE IN ID JP KZ KI KP KR KG LA MY MV MH FM MN MM NR NP NZ PK PW PG PH WS SG SB LK TW TJ TH TL TO TM TV UZ VU VN'.split(' ')
  };
  const nameOverrides={
    BO:'Bolivia',BN:'Brunei',CD:'Democratic Republic of the Congo',CG:'Republic of the Congo',CI:"Côte d’Ivoire",CV:'Cape Verde',
    CZ:'Czech Republic',EH:'Western Sahara',FM:'Micronesia',GB:'United Kingdom',IR:'Iran',KR:'South Korea',KP:'North Korea',
    LA:'Laos',MD:'Moldova',MK:'North Macedonia',PS:'Palestine',RU:'Russia',ST:'São Tomé and Príncipe',SY:'Syria',
    SZ:'Eswatini',TW:'Taiwan',TZ:'Tanzania',US:'United States',VA:'Vatican City',VE:'Venezuela',VN:'Vietnam',XK:'Kosovo'
  };
  const displayNames=typeof Intl!=='undefined'&&Intl.DisplayNames?new Intl.DisplayNames(['en'],{type:'region'}):null;
  const flag=code=>`/flags/${code.toLowerCase()}.svg`;
  const countries=[];
  Object.entries(regionCodes).forEach(([region,codes])=>codes.forEach(code=>countries.push({
    code,
    name:nameOverrides[code]||(displayNames?displayNames.of(code):code),
    region,
    flag:flag(code)
  })));
  countries.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  root.DEADLINE_COUNTRIES=countries;
  if(typeof module!=='undefined'&&module.exports)module.exports=countries;
})(typeof window!=='undefined'?window:globalThis);
