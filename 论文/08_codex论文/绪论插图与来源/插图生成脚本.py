from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import pypdfium2 as pdfium
from PIL import Image
OUT=Path('/Users/harrychen/Desktop/startrace/论文/08_codex论文/绪论插图与来源')
OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Songti','/System/Library/Fonts/Supplemental/Songti.ttc',subfontIndex=6))
pdfmetrics.registerFont(TTFont('Heiti','/System/Library/Fonts/STHeiti Medium.ttc',subfontIndex=1))
def text(c,x,y,s,size=10,font='Songti',center=True):
 c.setFont(font,size);c.setFillColorRGB(.08,.08,.08)
 (c.drawCentredString if center else c.drawString)(x,y,s)
def box(c,x,y,w,h):
 c.setFillColorRGB(.975,.975,.975);c.setStrokeColorRGB(.25,.25,.25);c.setLineWidth(.7);c.rect(x,y,w,h,fill=1,stroke=1)
def arrow(c,x1,y1,x2,y2,dashed=False):
 import math
 c.setStrokeColorRGB(.3,.3,.3);c.setFillColorRGB(.3,.3,.3);c.setLineWidth(.8)
 c.setDash(3,2) if dashed else c.setDash()
 c.line(x1,y1,x2,y2);c.setDash()
 a=math.atan2(y2-y1,x2-x1);L=4.5
 p=c.beginPath();p.moveTo(x2,y2);p.lineTo(x2-L*math.cos(a-.4),y2-L*math.sin(a-.4));p.lineTo(x2-L*math.cos(a+.4),y2-L*math.sin(a+.4));p.close();c.drawPath(p,stroke=0,fill=1)
def end(c,name):
 c.save();doc=pdfium.PdfDocument(str(OUT/(name+'.pdf')));im=doc[0].render(scale=4).to_pil();im.save(OUT/(name+'.png'))
# Figure 1
c=canvas.Canvas(str(OUT/'figure1.pdf'),pagesize=(440,205))
for x,title,l1,l2 in [(8,'表达意图','主题与情感','希望表达什么'),(119,'创作决定','内容与构图','选择、排列、调整'),(230,'笔触执行','形状、色彩与顺序','逐笔转化为画面'),(341,'画面结果','可见的视觉关系','判断是否符合意图')]:
 box(c,x,100,91,83);text(c,x+45.5,160,title,11,'Heiti');text(c,x+45.5,137,l1,9);text(c,x+45.5,120,l2,8.5)
for x in [99,210,321]:arrow(c,x+2,143,x+18,143)
# Return from the emerging picture to choices, not straight causal success
c.setDash(3,2);c.setStrokeColorRGB(.35,.35,.35);c.line(386,100,386,76);c.line(386,76,164,76);c.setDash();arrow(c,164,76,164,100,True)
text(c,276,57,'观察中间画面，继续发展或修正想法',9)
c.setStrokeColorRGB(.72,.72,.72);c.line(8,42,432,42)
text(c,220,24,'研究关注：表达决定能否落实，以及实现这些决定所需的负担',9.3)
end(c,'figure1')
# Figure 3: compact two-row sequence to keep the framework beside its explanation.
c=canvas.Canvas(str(OUT/'figure3.pdf'),pagesize=(440,155))
rows=[(0,88,'第一章  提出问题','研究背景与相关工作','研究目标、方法与范围'),(155,88,'第二章  需求研究','访谈与任务观察','用户困难与设计要求'),(310,88,'第三章  理论推导','外部认知与自主体验','协作原则及交互映射'),(310,3,'第四章  设计实践','笔触方法调整','功能流程与视觉规范'),(155,3,'第五章  实验评价','预试与四条件对照','结果分析及设计讨论'),(0,3,'第六章  结论展望','研究贡献与适用边界','局限及后续研究方向')]
for x,y,title,one,two in rows:
 box(c,x,y,130,60);text(c,x+65,y+41,title,10.5,'Heiti');text(c,x+65,y+25,one,9);text(c,x+65,y+10,two,9)
arrow(c,132,118,153,118);arrow(c,287,118,308,118);arrow(c,375,86,375,65);arrow(c,308,33,287,33);arrow(c,153,33,132,33)
c.setDash(3,2);c.setStrokeColorRGB(.35,.35,.35);c.line(220,63,220,75);c.line(220,75,347,75);c.setDash();arrow(c,347,75,347,63,True)
text(c,280,78,'预试反馈与修订',8)
end(c,'figure3')
# An exact figure crop from the author-version PDF, no reconstruction of the source drawing
pdf=pdfium.PdfDocument('/tmp/startrace-intro-20261026/ShadowDrawSiggraph11.pdf')
im=pdf[0].render(scale=4).to_pil();w,h=im.size
im.crop((int(w*.151),int(h*.150),int(w*.852),int(h*.339))).save(OUT/'figure2.png')
print(OUT)
