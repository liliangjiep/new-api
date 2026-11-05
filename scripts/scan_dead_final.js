const fs=require('fs');
const path=require('path');
const root='apps/web/src';
function walk(d){let o=[];for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())o=o.concat(walk(p));else if(p.endsWith('.tsx'))o.push(p)}return o}
let n=0;
for(const p of walk(root)){
  const t=fs.readFileSync(p,'utf8');
  const re=new RegExp('<button\\b([\\s\\S]*?)>','g');
  let m;
  while((m=re.exec(t))){
    const tag=m[1];
    const line=t.slice(0,m.index).split('\n').length;
    const has=tag.indexOf('onClick')>=0||tag.indexOf('onSubmit')>=0||tag.indexOf('onMouse')>=0||tag.indexOf('onKey')>=0||tag.indexOf('onPointer')>=0||tag.indexOf('onTouch')>=0||tag.indexOf('onFocus')>=0||tag.indexOf('onChange')>=0||tag.indexOf('{...props}')>=0||tag.indexOf('{...rest}')>=0;
    const isSubmit=tag.indexOf('type="submit"')>=0||tag.indexOf("type='submit'")>=0;
    if(has||isSubmit)continue;
    n++;
    const one=tag.replace(/\s+/g,' ').slice(0,160);
    console.log(p+':'+line+': dis='+String(tag.indexOf('disabled')>=0)+' :: '+one);
  }
}
console.log('TOTAL '+n);
