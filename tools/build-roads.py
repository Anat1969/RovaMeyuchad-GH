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
row=unary_union(polys+[link]).buffer(4,join_style=1).buffer(-5.5,join_style=1).buffer(1.5,join_style=1)
# רק מה שבסביבת התוכנית
from shapely.geometry import box
row=row.intersection(box(min(lx)-330,min(ly)-330,max(lx)+330,max(ly)+330))
# המיסעה: כ-4 מ' מדרכה מכל צד. ההחלקה עדינה, כדי שרחובות פנימיים צרים לא ייעלמו
car=row.buffer(-5.2,join_style=1).buffer(2.4,join_style=1).buffer(-1.2,join_style=1)
# חורים קטנים בזכות הדרך ובמיסעה הם סמלים וכיתובים שבתשריט (עץ, מספר, חץ), ולא איים אמיתיים. ממלאים אותם,
# אחרת מתקבלים "איי מדרכה" עם עצים באמצע כביש או צומת. חור גדול הוא בלוק בנוי, והוא נשאר
def fill(g, amin):
    gs=list(g.geoms) if hasattr(g,'geoms') else [g]
    return unary_union([Polygon(a.exterior,[h for h in a.interiors if Polygon(h).area>=amin]) for a in gs if a.geom_type=='Polygon'])
row=fill(row,1500); car=fill(car,1500)
# מגרש אינו דרך: גוון דומה בתשריט גרם לכך שבלוקים שלמים נצבעו כמדרכה
_lots=unary_union([Polygon(l['ring']).buffer(0) for l in q['lots']])
row=row.difference(_lots.buffer(-0.3)); car=car.difference(_lots.buffer(1.5))
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
from shapely.geometry import Polygon as _P
lotsU=unary_union([Polygon(l['ring']).buffer(0) for l in q['lots']])
zone=lotsU.buffer(95)
zoneJ=lotsU.buffer(170)
ROUNDS=[(-265.4,93.7),(184.4,-105.5)]  # שתי הכיכרות שעל כביש 8, לפי נספח התנועה. הסובה בקצה ניסים חדד אינה כיכר
cb=car.boundary
def rin(x,y): return cb.distance(Point(x,y)) if car.contains(Point(x,y)) else 0
def recenter(x,y,span):
    # הנקודה הרחוקה ביותר מאבן השפה בסביבה: מרכז הצומת
    best=(rin(x,y),x,y); n=int(span)
    for i in range(-n,n+1,2):
        for j in range(-n,n+1,2):
            v=rin(x+i,y+j)
            if v>best[0]: best=(v,x+i,y+j)
    return best
def arms(x,y,D):
    ring=Point(x,y).buffer(D+1.6).difference(Point(x,y).buffer(D-1.6)).intersection(car)
    return [a for a in (list(ring.geoms) if hasattr(ring,'geoms') else [ring]) if not a.is_empty and a.area>=6]
# צמתים: מועמדים מכרסום המיסעה בכמה קני מידה. צומת אמיתי: שלוש זרועות לפחות
cand=[]
for r in (3.2,4.6,6.5,9,12.5,16,20,25,30):
    e=car.buffer(-r,join_style=1)
    for g in (list(e.geoms) if hasattr(e,'geoms') else [e]):
        if g.is_empty: continue
        x0,y0,x1,y1=g.bounds
        if max(x1-x0,y1-y0)<3.2*r+6 and g.area>3: cand.append((g.centroid.x,g.centroid.y))
junc=[]  # x, y, רדיוס פנימי, כיכר
for x,y in ROUNDS:
    # כיכר רק במקום שהוא באמת צומת רחב: קרוב למיקום שבנספח, שלוש זרועות לפחות, ומקום לאי ולנתיב סביבו
    x0_,y0_=x,y
    R,x,y=recenter(x,y,12)
    if R>=10 and math.hypot(x-x0_,y-y0_)<=14 and len(arms(x,y,R+7))>=3: junc.append((x,y,R,True))
    else: print('roundabout skipped',x0_,y0_,round(R,1))
for x,y in cand:
    R,x,y=recenter(x,y,8)
    if R<3 or not zoneJ.contains(Point(x,y)): continue
    if any(math.hypot(x-j[0],y-j[1])<j[2]+R+10 for j in junc): continue
    if len(arms(x,y,R+4))>=3: junc.append((x,y,R,False))
print('junctions',len(junc),'roundabouts',sum(1 for j in junc if j[3]))
# איי הכיכרות
islands=[Point(x,y).buffer(max(3,R*0.42)) for x,y,R,rd in junc if rd]
# מעבר חצייה: ישר, בניצב לכביש, בכל זרוע. בכביש רחב נשאר אי מפלט באמצע
stripes=[]; refuges=[]
for x,y,R,rd in junc:
    D=R+(7 if rd else 4)
    for arm in arms(x,y,D):
        c=arm.centroid; ux,uy=c.x-x,c.y-y; L_=math.hypot(ux,uy) or 1; ux,uy=ux/L_,uy/L_; vx,vy=-uy,ux
        cx_,cy_=x+ux*D,y+uy*D
        ext=[]
        for sgn in (1,-1):
            t=0
            while t<45 and car.contains(Point(cx_+vx*sgn*(t+0.5),cy_+vy*sgn*(t+0.5))): t+=0.5
            ext.append(t)
        lo,hi=-ext[1],ext[0]
        if hi-lo<4: continue
        mid=(lo+hi)/2; wide=(hi-lo)>=17
        if wide: refuges.append(_P([(cx_+vx*(mid+a)+ux*b,cy_+vy*(mid+a)+uy*b) for a,b in ((-1.5,-2.4),(1.5,-2.4),(1.5,2.4),(-1.5,2.4))]))
        t=lo+0.4
        while t<=hi-0.9:
            if not (wide and abs(t+0.25-mid)<1.9):
                st=_P([(cx_+vx*t+ux*a_,cy_+vy*t+uy*a_) for a_ in (-1.6,1.6)]+[(cx_+vx*(t+0.5)+ux*a_,cy_+vy*(t+0.5)+uy*a_) for a_ in (1.6,-1.6)])
                if car.contains(st): stripes.append(st)
            t+=1.0
cross=unary_union(stripes) if stripes else Polygon()
clear=unary_union([Point(x,y).buffer(R+(11 if rd else 8)) for x,y,R,rd in junc])
clearM=unary_union([Point(x,y).buffer(R*1.6+12) for x,y,R,rd in junc])
def okMedian(g):
    # אי תנועה הוא פס ארוך וצר. כל צורה אחרת היא שארית של החישוב, ונזרקת
    if g.geom_type!='Polygon' or g.area<90: return False
    c=list(g.minimum_rotated_rectangle.exterior.coords)
    a_=math.hypot(c[1][0]-c[0][0],c[1][1]-c[0][1]); b_=math.hypot(c[2][0]-c[1][0],c[2][1]-c[1][1])
    return min(a_,b_)<=7 and max(a_,b_)>=30 and g.area>=0.45*a_*b_
# אי תנועה מגונן: פס במרכז כל כביש שרוחבו 17 מ' ומעלה, מוחלק, ונעצר לפני כל צומת
thin=[]
for h in (8.5,10.5,12.5,14.5,16.5,18.5,20.5,22.5,24.5,26.5):
    e=car.buffer(-h,join_style=1)
    if e.is_empty: continue
    thin.append(e.difference(e.buffer(-2.2,join_style=1).buffer(2.4,join_style=1)))
median=unary_union(thin).buffer(2.2,join_style=1).buffer(-1.6,join_style=1).intersection(zone).difference(clearM)
median=unary_union([g for g in (list(median.geoms) if hasattr(median,'geoms') else [median]) if okMedian(g)]+refuges+islands)
# רצועות ועצים: נעצרים לפני הצמתים, כדי שהפינות ומעברי החצייה יישארו פנויים
strip=car.buffer(2.3,join_style=1).difference(car.buffer(0.5,join_style=1)).intersection(row).intersection(zone).difference(clear)
swale=car.buffer(1.9,join_style=1).difference(car.buffer(0.9,join_style=1)).intersection(row).intersection(zone).difference(clear)
line=car.buffer(1.4,join_style=1).boundary
pc=prep(car); pr=prep(row.buffer(-0.8)); pz=prep(zone); pcl=prep(clear)
pts=[]
for ln in (list(line.geoms) if hasattr(line,'geoms') else [line]):
    for k in range(int(ln.length//6)):
        a=ln.interpolate(k*6+3); b=ln.interpolate(k*6+3.5)
        dx,dy=b.x-a.x,b.y-a.y; L_=math.hypot(dx,dy) or 1; nx,ny=-dy/L_,dx/L_
        if pc.contains(Point(a.x+nx*2,a.y+ny*2)): nx,ny=-nx,-ny
        if not pz.contains(a) or not pr.contains(a) or pcl.contains(a): continue
        pts.append([round(a.x,1),round(a.y,1),round(nx,2),round(ny,2)])
def dumpS(g, tol, amin):
    gs=list(g.geoms) if hasattr(g,'geoms') else [g]
    o=[]
    for a_ in gs:
        if a_.geom_type!='Polygon' or a_.area<amin: continue
        a_=a_.simplify(tol)
        o.append({'o':[[round(x,1),round(y,1)] for x,y in list(a_.exterior.coords)[:-1]], 'h':[]})
    return o
def dumpH(g, tol, amin):
    gs=list(g.geoms) if hasattr(g,'geoms') else [g]
    o=[]
    for a_ in gs:
        if a_.geom_type!='Polygon' or a_.area<amin: continue
        a_=a_.simplify(tol)
        o.append({'o':[[round(x,1),round(y,1)] for x,y in list(a_.exterior.coords)[:-1]], 'h':[[[round(x,1),round(y,1)] for x,y in list(h.coords)[:-1]] for h in a_.interiors]})
    return o
d={'row':dump(row,0.5,350),'road':dump(car,0.5,40),'strip':dumpH(strip,0.4,15),'swale':dumpH(swale,0.4,10),'median':dumpS(median,0.4,6),'cross':dumpS(cross,0.01,0.5),'curb':pts,'rounds':[[round(x,1),round(y,1),round(max(3,R*0.42),1)] for x,y,R,rd in junc if rd]}
print({k:len(v) for k,v in d.items()})
HEAD = """// נוצר אוטומטית מתשריט המצב המאושר של תכנית 603-0811588 (נספח רקע, וקטורי). לא לערוך ידנית.
// row: זכות הדרך (דרך מאושרת ודרך מוצעת), כפי שהיא צבועה בתשריט. road: המיסעה, זכות הדרך פחות כ-4 מ' מכל צד (הנחה).
// strip, swale: רצועות שירות וביוסוואל סביב המיסעה. median: אי תנועה מגונן בכבישים הרחבים. cross: פסי מעברי החצייה, ישרים ובניצב לכביש, בכניסה לכל צומת (מיקום סכמטי). curb: נקודה כל 6 מ' לאורך אבן השפה, עם הכיוון אל המדרכה.
// כביש 8 בין שני גושי המגורים מכוסה בתשריט בקווקוו, ולכן הושלם סכמטית.
export interface Area { o: [number, number][]; h: [number, number][][] }
export const ROADS: { row: Area[]; road: Area[]; strip: Area[]; swale: Area[]; median: Area[]; cross: Area[]; curb: [number, number, number, number][]; rounds: [number, number, number][] } = """
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
