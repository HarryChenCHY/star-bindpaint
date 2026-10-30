from pathlib import Path
from html import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
import pypdfium2 as pdfium
import math

R=Path('/tmp/startrace-section13-14-20261027')
pdfmetrics.registerFont(TTFont('Song','/System/Library/Fonts/Supplemental/Songti.ttc',subfontIndex=6))
pdfmetrics.registerFont(TTFont('Hei','/System/Library/Fonts/STHeiti Medium.ttc',subfontIndex=1))

class Figure:
 def __init__(self,w,h):self.w=w;self.h=h;self.ops=[]
 def rect(self,x,y,w,h,fill='#FFFFFF',stroke='#404040',lw=.85):self.ops.append(('rect',x,y,w,h,fill,stroke,lw))
 def line(self,x1,y1,x2,y2,lw=.85,color='#404040',dash=False):self.ops.append(('line',x1,y1,x2,y2,lw,color,dash))
 def arrow(self,x1,y1,x2,y2,lw=.9,color='#404040',dash=False):
  self.line(x1,y1,x2,y2,lw,color,dash);a=math.atan2(y2-y1,x2-x1);d=5
  self.ops.append(('poly',[(x2,y2),(x2-d*math.cos(a-.5),y2-d*math.sin(a-.5)),(x2-d*math.cos(a+.5),y2-d*math.sin(a+.5))],color))
 def text(self,x,y,t,size=13,font='Song',color='#1A1A1A',align='center'):
  self.ops.append(('text',x,y,t,size,font,color,align))
 def lines(self,x,y,lines,size=13,leading=19,font='Song',color='#1A1A1A'):
  for i,t in enumerate(lines):self.text(x,y+i*leading,t,size,font,color)
 def box(self,x,y,w,h,lines,size=13,fill='#FFFFFF',font='Song',leading=19):
  self.rect(x,y,w,h,fill)
  self.lines(x+w/2,y+(h-(len(lines)-1)*leading)/2+size*.32,lines,size,leading,font)
 def save(self,name):
  c=canvas.Canvas(str(R/(name+'.pdf')),pagesize=(self.w,self.h));sv=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}">','<rect width="100%" height="100%" fill="white"/>']
  for op in self.ops:
   if op[0]=='rect':
    _,x,y,w,h,fill,stroke,lw=op;c.setFillColor(HexColor(fill));c.setStrokeColor(HexColor(stroke));c.setLineWidth(lw);c.setDash();c.rect(x,self.h-y-h,w,h,stroke=1,fill=1)
    sv.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{lw}"/>')
   elif op[0]=='line':
    _,x1,y1,x2,y2,lw,col,dash=op;c.setStrokeColor(HexColor(col));c.setLineWidth(lw);c.setDash(3,3) if dash else c.setDash();c.line(x1,self.h-y1,x2,self.h-y2);c.setDash()
    sv.append(f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="{col}" stroke-width="{lw}"'+(' stroke-dasharray="3 3"' if dash else '')+'/>')
   elif op[0]=='poly':
    _,pts,col=op;c.setFillColor(HexColor(col));pa=c.beginPath();pa.moveTo(pts[0][0],self.h-pts[0][1])
    for x,y in pts[1:]:pa.lineTo(x,self.h-y)
    pa.close();c.drawPath(pa,fill=1,stroke=0);sv.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in pts)+f'" fill="{col}"/>')
   elif op[0]=='text':
    _,x,y,t,size,font,col,align=op;c.setFont(font,size);c.setFillColor(HexColor(col))
    (c.drawCentredString if align=='center' else c.drawString)(x,self.h-y,t)
    family='Heiti SC, SimHei, sans-serif' if font=='Hei' else 'Songti SC, SimSun, serif'
    sv.append(f'<text x="{x}" y="{y}" text-anchor="'+('middle' if align=='center' else 'start')+f'" font-family="{family}" font-size="{size}" fill="{col}">{escape(t)}</text>')
  c.save();sv.append('</svg>');(R/(name+'.svg')).write_text('\n'.join(sv))
  d=pdfium.PdfDocument(str(R/(name+'.pdf')));d[0].render(scale=3).to_pil().save(R/(name+'.png'))

f=Figure(620,285)
f.text(310,23,'用户的表达决定如何进入绘画结果',17,'Hei')
f.box(12,66,88,76,['照片与','可用素材'],13.5,fill='#F4F4F4')
f.box(122,66,150,76,['用户编排','选择、位置、尺度','与组合关系'],13.5,font='Hei',leading=19)
f.box(294,66,150,76,['系统执行','目标更新、笔触规划','与渐进绘制'],13.5,font='Hei',leading=19)
f.box(466,66,142,76,['共同画面','布局决定的落实','及其绘画表现'],13.5,fill='#F4F4F4',leading=19)
for a,b in [(100,122),(272,294),(444,466)]:f.arrow(a+2,104,b-3,104)
f.text(197,54,'内容与关系判断',11,color='#555555');f.text(369,54,'笔迹执行',11,color='#555555')
f.line(537,142,537,173);f.line(537,173,197,173);f.arrow(197,173,197,145)
f.text(367,195,'观察画面后继续判断与编排',13,'Hei')
f.rect(12,216,596,55,'#F4F4F4','#A0A0A0',.7)
f.text(310,237,'评价范围：意图与作品对应、感知选择、操作过程及可用性',12)
f.text(310,257,'过程研究：观察、判断与后续编排的事件联系',11.5,color='#555555')
f.save('研究范围图')

f=Figure(620,778)
f.box(72,5,536,39,['基于图像笔触拆解计算的创作表达工具交互设计'],17,font='Hei')
f.arrow(340,44,340,61)
rows=[
 ('第一章  绪论','文献研究',['日常表达场景','相关工具与算法研究'],['比较相关研究','界定问题与适用范围'],['RQ1—RQ3','后续证据需求']),
 ('第二章  表达需求与创作阻力','访谈与观察',['RQ1与目标用户','既有原型背景'],['核查创作经历','观察普通画布任务'],['表达需求','执行与操作阻力']),
 ('第三章  理论与交互设计原则','理论推导',['需求与阻力','认知、设计及动机理论'],['解释素材与过程反馈','建立交互设计原则'],['原则及要素映射','对应评价要求']),
 ('第四章  交互机制与视觉设计实践','设计实践',['原则及要素映射','既有笔触方法'],['编排、续绘与状态提示','算法适配与界面设计'],['定稿产品及设计取舍','受控算法效果比较']),
 ('第五章  实验评价与讨论','定性定量实验',['RQ3与定稿产品','实验专用适配'],['2×2预试与正式实验','作品、量表、日志访谈'],['主效应与交互作用','过程解释及适用边界']),
 ('第六章  结论与展望','证据综合',['需求、设计和评价证据','与研究问题的对应'],['回应研究问题','审视贡献及局限'],['设计认识与贡献范围','后续研究方向'])]
for i,(title,method,inputs,core,outputs) in enumerate(rows):
 y=65+i*116
 f.rect(72,y,536,23,'#111111','#111111');f.text(340,y+16,title,14.5,'Hei','#FFFFFF')
 f.rect(12,y,48,95,'#EEEEEE','#D0D0D0',.65)
 # Vertical method labels follow the reference's method rail.
 chars=list(method);size=10.7;lead=11.8;yy=y+(95-(len(chars)-1)*lead)/2+size*.3
 for k,ch in enumerate(chars):f.text(36,yy+k*lead,ch,size)
 xvals=[72,239,430];ws=[155,179,178]
 for x,w,lab,ls in zip(xvals,ws,['输入','研究内容','输出'],[inputs,core,outputs]):
  f.rect(x,y+30,w,65)
  f.text(x+w/2,y+45,lab,10.6,'Hei','#555555');f.lines(x+w/2,y+64,ls,11.4,17)
 f.arrow(228,y+64,237,y+64,.8);f.arrow(419,y+64,428,y+64,.8)
 if i<5:f.arrow(340,y+96,340,y+112,.9)
f.text(340,772,'箭头表示章节间的论证承接与证据传递。',10.2,color='#555555')
f.save('研究框架图')
print('Created two original figures as PDF, SVG and PNG.')
