from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy
from lxml import etree as E
import re, json, hashlib
from translation import T

work=Path('/tmp/startrace-bilingual-work')
src=Path(work.joinpath('backup-path.txt').read_text())
out=work/'陈皓宇-硕士生中期检查.docx'
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
N={'w':W,'wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
def q(s):return '{'+W+'}'+s
def txt(p):return ''.join(p.xpath('.//w:t/text()',namespaces=N))
def prop(p,name,attrs):
 pp=p.find(q('pPr'))
 if pp is None:pp=E.Element(q('pPr'));p.insert(0,pp)
 t=pp.find(q(name))
 if t is None:t=E.SubElement(pp,q(name))
 for k,v in attrs.items():t.set(q(k),str(v))
 return t

def replace(p,text):
 rp=p.find('w:r/w:rPr',N)
 rp=deepcopy(rp) if rp is not None else E.Element(q('rPr'))
 for node in list(p):
  if node.tag!=q('pPr'):p.remove(node)
 for el in list(rp):
  if E.QName(el).localname in ['rFonts','lang','highlight']:rp.remove(el)
 f=E.Element(q('rFonts'));f.set(q('ascii'),'Times New Roman');f.set(q('hAnsi'),'Times New Roman');f.set(q('eastAsia'),'宋体');rp.insert(0,f)
 lang=E.SubElement(rp,q('lang'));lang.set(q('val'),'en-US')
 run=E.SubElement(p,q('r'));run.append(rp);t=E.SubElement(run,q('t'));t.text=text;t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')

with ZipFile(src) as z:
 data={x.filename:z.read(x.filename) for x in z.infolist()}
r=E.fromstring(data['word/document.xml']);b=r.find(q('body'));ps=r.xpath('//w:p',namespaces=N)
assert txt(ps[52])=='一、研究目标与中期工作概况'
assert txt(ps[204])=='参考文献'
start=b.index(ps[52]);end=b.index(ps[224])+1
originals=list(b)[start:end]
clones=[deepcopy(x) for x in originals]
english_ps=[]
for x in clones:
 english_ps.extend([x] if x.tag==q('p') else x.xpath('.//w:p',namespaces=N))
assert len(english_ps)==173
alignment=[]
for idx,p in zip(range(52,225),english_ps):
 original=txt(ps[idx])
 if idx in T:replace(p,T[idx])
 elif original.startswith('原文 / 来源：'):
  for t in p.xpath('.//w:t',namespaces=N):
   if t.text:t.text=t.text.replace('原文 / 来源：','Original publication / Source: ')
 else:
  assert not re.search(r'[\u3400-\u9fff]',original),(idx,original)
 alignment.append({'source_paragraph':idx,'chinese':original,'english':txt(p),'images':len(p.xpath('.//w:drawing',namespaces=N))})
 if p.xpath('.//w:drawing',namespaces=N):prop(p,'keepNext',{'val':'1'})
 if idx in [73,142,176]:prop(p,'keepNext',{'val':'1'})
 # Explicit English fonts override inherited East Asian theme fonts.
 pp=p.find(q('pPr'))
 if pp is not None:
  for f in pp.findall('w:rPr/w:rFonts',N):
   for k in list(f.attrib):
    if 'theme' in k.lower():del f.attrib[k]
   f.set(q('ascii'),'Times New Roman');f.set(q('hAnsi'),'Times New Roman')

# Keep all original images and relationships, assigning fresh drawing and paragraph IDs.
next_draw=max(int(x.get('id')) for x in r.xpath('//wp:docPr',namespaces=N))+1
for block in clones:
 for el in list(block.iter()):
  if E.QName(el).localname in ['bookmarkStart','bookmarkEnd','permStart','permEnd','lastRenderedPageBreak']:
   el.getparent().remove(el);continue
  for k in list(el.attrib):
   if E.QName(k).localname in ['paraId','textId','anchorId','editId']:
    el.set(k,hashlib.sha256((str(next_draw)+str(id(el))+k).encode()).hexdigest()[:8].upper())
  if el.tag=='{'+N['wp']+'}docPr':
   el.set('id',str(next_draw));el.set('name','English figure '+str(next_draw));next_draw+=1
 if block.tag==q('tbl'):
  for tr in block.findall(q('tr')):
   trpr=tr.find(q('trPr'))
   if trpr is None:trpr=E.Element(q('trPr'));tr.insert(0,trpr)
   for h in trpr.findall(q('trHeight')):trpr.remove(h)
   if trpr.find(q('cantSplit'))is None:E.SubElement(trpr,q('cantSplit'))
  trpr=block.find('w:tr/w:trPr',N)
  if trpr.find(q('tblHeader'))is None:E.SubElement(trpr,q('tblHeader'))
  for p in block.xpath('.//w:p',namespaces=N):
   prop(p,'spacing',{'before':0,'after':60,'line':264,'lineRule':'auto'})
   prop(p,'ind',{'firstLine':0,'firstLineChars':0})
   prop(p,'jc',{'val':'left'})
   for rp in p.xpath('.//w:rPr',namespaces=N):
    sz=rp.find(q('sz'))
    if sz is None:sz=E.SubElement(rp,q('sz'))
    sz.set(q('val'),'21')

zh='\n'.join(txt(x) for x in ps[52:204])
en='\n'.join(txt(x) for x in english_ps[:152])
cn_count=len(re.findall(r'[\u3400-\u4dbf\u4e00-\u9fff\U00020000-\U0002fa1f]',zh))
# English words: alphabetic tokens; internal apostrophes/hyphens count as one.
# Exclude URLs, section numbers, mathematical symbols, and standalone numbers.
en_no_url=re.sub(r'https?://\S+','',en)
words=re.findall(r"[A-Za-z]+(?:[’'\-][A-Za-z]+)*",en_no_url)
en_count=len(words)
replace(ps[50],f'本人承诺，中期检查报告正文中文字数 {cn_count}，英文字数 {en_count}。若与事实不符，本人愿承担相应后果。')
# Restore the declaration's original Chinese font and remove the completed-field highlight.
for lang in ps[50].xpath('.//w:lang',namespaces=N):lang.set(q('val'),'zh-CN')
note=deepcopy(ps[224]);replace(note,'字数统计口径：中文按汉字字符计；英文按单词计（连字符复合词及含撇号的词计为一词）。包含正文标题、图表标题、注释及表内文字；不计参考文献、图片内部文字、网址、纯数字、模板文字和本统计说明。')
for color in note.xpath('.//w:color',namespaces=N):color.set(q('val'),'666666')
b.insert(b.index(ps[50])+1,note)
heading=deepcopy(ps[52]);replace(heading,'英文版正文 / English Version of the Report');prop(heading,'pageBreakBefore',{'val':'1'})
insert=b.index(ps[224])+1
b.insert(insert,heading)
for j,x in enumerate(clones,insert+1):b.insert(j,x)

# Verify that the entire Chinese body, including tables, drawings and references, is unchanged.
for original,current in zip(originals,list(b)[b.index(ps[52]):b.index(ps[52])+len(originals)]):
 assert E.tostring(original)==E.tostring(current)
assert [x['images'] for x in alignment]==[len(p.xpath('.//w:drawing',namespaces=N)) for p in ps[52:225]]
assert len(r.xpath('//wp:docPr/@id',namespaces=N))==len(set(r.xpath('//wp:docPr/@id',namespaces=N)))

# Keep the achievements heading together on a separate page.
prop(ps[237],'pageBreakBefore',{'val':'1'})
# Continue page numbering across template sections and use the actual document total.
for section in r.xpath('//w:sectPr',namespaces=N):
 for num in section.findall(q('pgNumType')):
  num.attrib.pop(q('start'),None)
for filename in list(data):
 if filename.startswith('word/footer') and filename.endswith('.xml'):
  footer=E.fromstring(data[filename])
  for field in footer.xpath('//w:instrText',namespaces=N):
   if field.text and 'SECTIONPAGES' in field.text:
    field.text=field.text.replace('SECTIONPAGES','NUMPAGES')
  data[filename]=E.tostring(footer,xml_declaration=True,encoding='UTF-8',standalone=True)
# The word processor will repaginate on opening.
data['word/document.xml']=E.tostring(r,xml_declaration=True,encoding='UTF-8',standalone=True)
with ZipFile(out,'w',ZIP_DEFLATED) as z:
 for k,v in data.items():z.writestr(k,v)
summary={'chinese_characters':cn_count,'english_words':en_count,'body_paragraphs_including_tables':152,'translated_paragraphs_including_references':len(english_ps),'figures':10,'embedded_images_per_version':sum(x['images'] for x in alignment),'tables_per_version':sum(x.tag==q('tbl') for x in clones),'backup':str(src),'output':str(out),'english_word_pattern':r"[A-Za-z]+(?:[’'\-][A-Za-z]+)*"}
work.joinpath('counts.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
work.joinpath('alignment.json').write_text(json.dumps(alignment,ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False,indent=2))
