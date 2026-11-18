import sys, json, glob, math, cv2, numpy as np
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
img, quarter, out = sys.argv[1:4]
q=json.loads(open(quarter,encoding='utf-8').read().split('= ',1)[1].rstrip().rstrip(';'))
im=cv2.imread(img); H,W=im.shape[:2]; im=im[:, :int(W*0.66)]; print(im.shape)
def mask(rgb, tol=26):
    b,g,r=rgb[2],rgb[1],rgb[0]
    return (np.abs(im.astype(int)-np.array([b,g,r])).max(2)<=tol).astype(np.uint8)*255
lots=mask((255,127,0)); ys,xs=np.where(lots>0)
lx=[x for l in q['lots'] for x,y in l['ring']]; ly=[y for l in q['lots'] for x,y in l['ring']]
# עיגון: מציירים את מגרשי התכנית בקנה מידה נתון, ומחפשים את קנה המידה וההזזה שבהם הם מכסים הכי טוב את המגרשים הכתומים
f=0.25
small=cv2.resize(lots,None,fx=f,fy=f,interpolation=cv2.INTER_AREA).astype(np.float32)
def tplOf(M):
    tw=int((max(lx)-min(lx))/M)+1; th=int((max(ly)-min(ly))/M)+1
    t=np.zeros((th,tw),np.uint8)
    for l in q['lots']:
        pts=np.array([[(x-min(lx))/M,(max(ly)-y)/M] for x,y in l['ring']]).round().astype(np.int32)
        cv2.fillPoly(t,[pts],255)
    return t
best=(0,)
for M in np.arange(0.380,0.520,0.004):
    t=tplOf(M)
    if t.shape[0]*f>=small.shape[0] or t.shape[1]*f>=small.shape[1]: continue
    res=cv2.matchTemplate(small,cv2.resize(t,None,fx=f,fy=f,interpolation=cv2.INTER_AREA).astype(np.float32),cv2.TM_CCOEFF_NORMED)
    _,sc,_,loc=cv2.minMaxLoc(res)
    if sc>best[0]: best=(sc,M,loc[0]/f,loc[1]/f)
sc,M,px0,py0=best; t=tplOf(M); th,tw=t.shape
bb=(0,px0,py0)
for dx in range(-8,9):
    for dy in range(-8,9):
        xx,yy=int(px0+dx),int(py0+dy)
        v=int((lots[yy:yy+th,xx:xx+tw]>0)[t>0].sum())
        if v>bb[0]: bb=(v,xx,yy)
_,px0,py0=bb; print('scale',round(M,4),'match',round(sc,3),'cover',round(bb[0]/(t>0).sum(),3))
tx=min(lx)-px0*M; ty=max(ly)+py0*M
road=cv2.bitwise_or(mask((255,0,63)),mask((221,193,110)))
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))
road=cv2.morphologyEx(road,cv2.MORPH_CLOSE,k); road=cv2.morphologyEx(road,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
cs,hier=cv2.findContours(road,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
L=lambda c:[(float(x)*M+tx, ty-float(y)*M) for x,y in c[:,0,:]]
polys=[]
for i,c in enumerate(cs):
    if hier[0][i][3]!=-1 or cv2.contourArea(c)*M*M<400: continue
    holes=[]; j=hier[0][i][2]
    while j!=-1:
        if cv2.contourArea(cs[j])*M*M>25: holes.append(L(cs[j]))
        j=hier[0][j][0]
    polys.append(Polygon(L(c),holes).buffer(0))
from shapely.geometry import LineString
# כביש 8 בין שני הגושים מכוסה בתשריט בקווקוו של מגבלות הבנייה, ולכן אינו נקלט לפי צבע. משלימים אותו סכמטית
link=LineString([[-95,-28],[-62,-36],[-20,-48],[20,-62],[60,-76],[100,-88],[142,-98],[184,-105.5],[250,-118]]).buffer(15,cap_style=2)
row=unary_union(polys+[link]).buffer(3,join_style=1).buffer(-3,join_style=1)
# רק מה שבסביבת התוכנית
from shapely.geometry import box
row=row.intersection(box(min(lx)-330,min(ly)-330,max(lx)+330,max(ly)+330))
car=row.buffer(-5.5,join_style=1).buffer(1.5,join_style=1)
print('ROW',round(row.area),'carriage',round(car.area))
def dump(g, tol, hmin):
    gs=list(g.geoms) if isinstance(g,MultiPolygon) else [g]
    o=[]
    for a in gs:
        if a.geom_type!='Polygon' or a.area<150: continue
        a=a.simplify(tol)
        o.append({'o':[[round(x,1),round(y,1)] for x,y in list(a.exterior.coords)[:-1]], 'h':[[[round(x,1),round(y,1)] for x,y in list(h.coords)[:-1]] for h in a.interiors if Polygon(h).area>hmin]})
    return o
from shapely.geometry import Point
from shapely.prepared import prep
lotsU=unary_union([Polygon(l['ring']).buffer(0) for l in q['lots']])
zone=lotsU.buffer(95)
strip=car.buffer(2.3,join_style=1).difference(car.buffer(0.5,join_style=1)).intersection(row).intersection(zone)
swale=car.buffer(1.9,join_style=1).difference(car.buffer(0.9,join_style=1)).intersection(row).intersection(zone)
line=car.buffer(1.4,join_style=1).boundary
pc=prep(car); pr=prep(row.buffer(-0.8)); pz=prep(zone)
pts=[]
for ln in (list(line.geoms) if hasattr(line,'geoms') else [line]):
    n=int(ln.length//6)
    for k in range(n):
        a=ln.interpolate(k*6+3); b=ln.interpolate(k*6+3.5)
        dx,dy=b.x-a.x,b.y-a.y; L_=math.hypot(dx,dy) or 1; nx,ny=-dy/L_,dx/L_
        if pc.contains(Point(a.x+nx*2,a.y+ny*2)): nx,ny=-nx,-ny
        if not pz.contains(a) or not pr.contains(a): continue
        pts.append([round(a.x,1),round(a.y,1),round(nx,2),round(ny,2)])
d={'row':dump(row,0.6,350),'road':dump(car,0.6,40),'strip':dump(strip,0.5,30),'swale':dump(swale,0.5,30),'curb':pts}
print({k:len(v) for k,v in d.items()}, sum(len(a['o'])+sum(len(h) for h in a['h']) for k in ('row','road','strip','swale') for a in d[k]))
HEAD = """// נוצר אוטומטית מתשריט המצב המאושר של תכנית 603-0811588 (נספח רקע, וקטורי). לא לערוך ידנית.
// row: זכות הדרך (דרך מאושרת ודרך מוצעת), כפי שהיא צבועה בתשריט. road: המיסעה, זכות הדרך פחות כ-4 מ' מכל צד (הנחה).
// strip, swale: רצועות שירות וביוסוואל סביב המיסעה. curb: נקודה כל 6 מ' לאורך אבן השפה, עם הכיוון אל המדרכה.
// כביש 8 בין שני גושי המגורים מכוסה בתשריט בקווקוו, ולכן הושלם סכמטית.
export interface Area { o: [number, number][]; h: [number, number][][] }
export const ROADS: { row: Area[]; road: Area[]; strip: Area[]; swale: Area[]; curb: [number, number, number, number][] } = """
open(out,'w',encoding='utf-8').write(HEAD+json.dumps(d,separators=(',',':'))+";\n")
from PIL import Image, ImageDraw
pm=Image.new('RGB',(1500,1300),'white'); dw=ImageDraw.Draw(pm)
P=lambda r:[((x+850)*0.85,(560-y)*0.85) for x,y in r]
for key,fc,hc in (('row',(214,196,160),'white'),('road',(90,90,95),(214,196,160))):
    for a in d[key]:
        dw.polygon(P(a['o']),fill=fc)
        for h in a['h']: dw.polygon(P(h),fill=hc)
for l in q['lots']: dw.polygon(P(l['ring']),outline=(230,110,20))
pm.save(out+'.png.png')
