"""Import a curated Twemoji 14.0.2 subset; retain originals and attribution."""
from pathlib import Path
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor
import json, hashlib, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
TAG='v14.0.2'
BASE=f'https://raw.githubusercontent.com/twitter/twemoji/{TAG}'
GROUPS=[
('people','人物行动','人物 动作 运动 people action', '1f9cd:站立 1f6b6:散步 1f3c3:跑步 1f483:跳舞 1f9ce:跪坐 1f9d8:冥想 1f6b4:骑车 1f3c2:滑雪 1f3c4:冲浪 1f3ca:游泳 1f9d7:攀登 1f939:杂耍 1f93a:击剑 1f3cc:高尔夫 1f93e:手球 1f3c7:骑马'),
('relationships','人际情感','情绪 纪念 陪伴 朋友 爱情 feeling love friend', '1f49b:爱心 1f494:心碎 1f917:拥抱 1f44f:掌声 1f48c:情书 1f91d:握手 1f46a:家人 1f46b:牵手伙伴 270c:胜利 1f64f:感谢 1f38a:庆祝 1f381:礼物 1f397:纪念丝带 1f56f:烛光 1f4ad:思绪 1f3b5:音符'),
('animals','动物伙伴','宠物 动物 自然 animal pet', '1f408:猫 1f415:狗 1f430:兔子 1f43b:小熊 1f98a:狐狸 1f43c:熊猫 1f428:考拉 1f981:狮子 1f426:小鸟 1f54a:白鸽 1f98b:蝴蝶 1f41f:小鱼 1f422:乌龟 1f40c:蜗牛 1f41d:蜜蜂 1f418:大象'),
('plants','花草自然','植物 花卉 花草 自然 flower plant tree', '1f331:嫩芽 1f33b:向日葵 1f339:玫瑰 1f337:郁金香 1f33c:小花 1f338:樱花 1f33a:扶桑花 1f335:仙人掌 1f334:棕榈树 1f333:大树 1f332:松树 1f33f:绿叶枝条 1f340:四叶草 1f341:枫叶 1f342:落叶 1f343:风中叶片'),
('sky','天空天气','天空 天气 星月 季节 cloud sun sky weather moon star', '2600:太阳 2601:云朵 1f327:雨云 26c8:雷雨 1f326:太阳雨 1f328:雪云 2744:雪花 1f32a:旋风 1f308:彩虹 1f319:弯月 1f315:满月 2b50:星星 2604:流星 26a1:闪电 1f525:火焰 1f4a7:水滴'),
('home','家居日常','生活 家具 物品 工作 记录 home object daily', '1f6cb:沙发 1f6cf:床 1fa91:椅子 1f6aa:门 1fa9f:窗户 1f4a1:灯泡 1f4da:书籍 1f4f7:相机 1f4bb:电脑 1f570:时钟 1f9f8:玩具熊 1f511:钥匙 1f9fa:篮子 1f9f9:扫帚 2614:雨伞 1f5bc:画框'),
('food','饮食聚会','美食 聚会 厨房 咖啡 水果 饮料 food drink cafe', '2615:咖啡 1f375:茶 1f9cb:奶茶 1f370:小蛋糕 1f382:生日蛋糕 1f35e:面包 1f950:牛角包 1f34e:苹果 1f353:草莓 1f34b:柠檬 1f372:汤锅 1f35c:面条 1f95f:饺子 1f363:寿司 1f37d:餐盘 1f377:红酒'),
('places','城市出行','场景 建筑 旅行 交通 户外 运动 city travel place', '1f3e0:房屋 1f3d9:城市 1f3eb:学校 1f3e2:办公楼 1f3de:山水 1f3d5:露营 1f3d6:海滩 1f698:汽车 1f6b2:自行车 1f68c:公交车 1f686:火车 2708:飞机 1f6a2:轮船 1f6e3:道路 1f3c0:篮球 1f392:背包')]
def fetch(path):
 with urlopen(Request(BASE+'/'+path,headers={'User-Agent':'StarTrace-academic-prototype'}),timeout=45) as response:return response.read()
assets=ROOT/'public/materials/twemoji';assets.mkdir(parents=True,exist_ok=True)
rows=[(category,title,words,*entry.split(':')) for category,title,words,entries in GROUPS for entry in entries.split()]
def download(row):
 category,title,words,code,label=row
 dest=assets/(code+'.svg')
 data=dest.read_bytes() if dest.exists() else fetch('assets/svg/'+code+'.svg')
 svg=ET.fromstring(data);assert svg.tag.endswith('svg')
 assert not any(x.tag.split('}')[-1] in ['script','foreignObject','image'] for x in svg.iter())
 dest.write_bytes(data)
 return {'id':'twemoji-'+code,'label':label,'category':category,'keywords':words,'path':'/materials/twemoji/'+code+'.svg','svg':data.decode(),'source':f'https://github.com/twitter/twemoji/blob/{TAG}/assets/svg/{code}.svg','license':'CC-BY-4.0','author':'Twitter, Inc. and other contributors','sha256':hashlib.sha256(data).hexdigest()}
with ThreadPoolExecutor(max_workers=8) as pool:items=list(pool.map(download,rows))
assert len(items)==128 and len({x['sha256'] for x in items})==128
(ROOT/'src/lib/default-materials.json').write_text(json.dumps(items,ensure_ascii=False,separators=(',',':'))+'\n')
(ROOT/'public/materials/default-materials-manifest.json').write_text(json.dumps([{k:v for k,v in x.items() if k!='svg'} for x in items],ensure_ascii=False,indent=2))
(assets/'LICENSE-GRAPHICS').write_bytes(fetch('LICENSE-GRAPHICS'))
(assets/'ATTRIBUTION.md').write_text(f'''# 星迹智绘默认素材：来源与署名\n\n## 使用说明\n\n本项目精选128个Twemoji矢量图形，保留原始SVG文件。中文名称、主题分类和检索词由星迹智绘整理。CC BY 4.0允许复制和改编，也可用于学术研究；使用时须保留署名、许可链接并说明改编。Twemoji代码的MIT许可与图形许可不同，本文档说明图形的CC BY 4.0许可。\n\n公开发布含默认素材的作品时，可使用以下署名，并按实际情况补充改动：\n\n> 图形源自Twemoji v14.0.2，© Twitter, Inc. 及其他贡献者，采用CC BY 4.0许可（https://creativecommons.org/licenses/by/4.0/）。由星迹智绘进行素材编排和笔触绘制；如有擦除、变换或配色调整，请一并说明。\n\n下载图片不附水印，此说明可单独随作品提供。用户自行上传的图片不受本素材许可覆盖，应单独确认其来源。\n\n## 来源与引用\n\nTwemoji graphics © Twitter, Inc. and other contributors.\nSource: https://github.com/twitter/twemoji/tree/{TAG}/assets/svg\nVersion: {TAG}\nLicense: Creative Commons Attribution 4.0 International (CC BY 4.0).\nhttps://creativecommons.org/licenses/by/4.0/\n\n128 original SVG files selected without editing the source artwork. Chinese names, categories and search keywords were added by StarTrace.\nThe application lets users transform, mask, recolor and render these graphics as painting strokes; exported creations may therefore contain adaptations.\nWhen publishing or redistributing works using these graphics, retain appropriate Twemoji attribution, link the license and identify changes.\n\nAcademic citation: TWITTER, INC., AND CONTRIBUTORS. Twemoji [EB/OL]. {TAG}. https://github.com/twitter/twemoji [accessed 2026-11-06].\n\nA per-file source URL and SHA-256 is provided in ../default-materials-manifest.json.\n''')
print(json.dumps({'count':len(items),'bytes':sum((assets/(x['id'][8:]+'.svg')).stat().st_size for x in items),'categories':[g[1] for g in GROUPS]},ensure_ascii=False))
