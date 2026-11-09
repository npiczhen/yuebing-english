import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {upgradeStories} from './story-content.mjs';
import {arrangeStoryStages} from './story-stage.mjs';
const root=new URL('../',import.meta.url), requests=new Map();
// The voice namespace prevents an old offline pack from sharing newly voiced Chinese files.
// English hashes stay unchanged so existing course downloads remain compatible.
const say=(text,lang='en')=>{const id=lang+'-'+createHash('sha1').update((lang==='zh'?'natural-v1:':'')+text).digest('hex').slice(0,12);requests.set(id,{id,text,lang});return id;};
const vocabulary=[
 ['cat','小猫',"It’s a cat."],['dog','小狗',"It’s a dog."],['bird','小鸟',"It’s a bird."],['fish','小鱼',"It’s a fish."],['bear','小熊',"It’s a bear."],['rabbit','小兔',"It’s a rabbit."],['duck','小鸭',"It’s a duck."],['frog','青蛙',"It’s a frog."],
 ['red','红色',"It’s red."],['blue','蓝色',"It’s blue."],['yellow','黄色',"It’s yellow."],['green','绿色',"It’s green."],['ball','球',"It’s a ball."],['car','小汽车',"It’s a car."],['teddy','玩具熊',"It’s a teddy."],['blocks','积木','Look! Blocks.'],
 ['apple','苹果','I like apples.'],['banana','香蕉','I like bananas.'],['milk','牛奶','I want milk.'],['water','水','I want water.'],['bread','面包','I like bread.'],['egg','鸡蛋','I like eggs.'],['orange','橙子','I like oranges.'],['rice','米饭','I like rice.'],
 ['jump','跳','I can jump.'],['run','跑','I can run.'],['walk','走','I can walk.'],['stop','停','Stop!'],['clap','拍手','I can clap.'],['wave','挥手','I can wave.'],['sit','坐下','Sit down.'],['stand','站起来','Stand up.'],
 ['head','头','Touch your head.'],['hand','手','Wave your hand.'],['eye','眼睛','This is my eye.'],['ear','耳朵','This is my ear.'],['nose','鼻子','Touch your nose.'],['mouth','嘴巴','This is my mouth.'],['arm','手臂','Touch your arm.'],['leg','腿','Touch your leg.'],
 ['hat','帽子','Put on your hat.'],['shoes','鞋子','These are my shoes.'],['shirt','上衣','This is my shirt.'],['pants','裤子','These are my pants.'],['dress','连衣裙','This is a dress.'],['socks','袜子','These are my socks.'],['coat','外套','Put on your coat.'],['skirt','裙子','This is a skirt.'],
 ['mom','妈妈','This is my mom.','Find Mom.'],['dad','爸爸','This is my dad.','Find Dad.'],['sister','姐妹','This is my sister.'],['brother','兄弟','This is my brother.'],['grandma','奶奶或外婆','This is my grandma.','Find Grandma.'],['grandpa','爷爷或外公','This is my grandpa.','Find Grandpa.'],['baby','小宝宝','Hello, baby!'],['family','家人','This is my family.'],
 ['bed','床','This is my bed.'],['chair','椅子','Sit on the chair.'],['table','桌子','This is a table.'],['door','门','Open the door.'],['window','窗户','Look at the window.'],['sofa','沙发','Sit on the sofa.'],['lamp','台灯','This is a lamp.'],['book','书','Open the book.'],
 ['box','盒子','This is a box.'],['basket','篮子','This is a basket.'],['in','在里面','In the box.','In the box.'],['on','在上面','On the box.','On the box.'],['under','在下面','Under the table.','Under the table.'],['behind','在后面','Behind the box.','Behind the box.'],['near','在近处','Near the box.','Near the box.'],['far','在远处','Far from the box.','Far from the box.'],
 ['sunny','晴朗的','It’s sunny.','Sunny!'],['rainy','下雨的','It’s rainy.','Rainy!'],['cloudy','多云的','It’s cloudy.','Cloudy!'],['windy','有风的','It’s windy.','Windy!'],['hot','热的','It’s hot.','Hot!'],['cold','冷的','It’s cold.','Cold!'],['snowy','下雪的','It’s snowy.','Snowy!'],['rainbow','彩虹','Look! A rainbow.','Rainbow!'],
 ['one','一','One apple.','One apple.'],['two','二','Two apples.','Two apples.'],['three','三','Three balls.','Three balls.'],['four','四','Four balls.','Four balls.'],['five','五','Five eggs.','Five eggs.'],['six','六','Six eggs.','Six eggs.'],['seven','七','Seven blocks.','Seven blocks.'],['eight','八','Eight blocks.','Eight blocks.'],
 ['happy','开心的','I’m happy.','Happy!'],['sad','难过的','I’m sad.','Sad!'],['hungry','饿了','I’m hungry.','Hungry!'],['thirsty','渴了','I’m thirsty.','Thirsty!'],['big','大的','A big box.','A big box.'],['small','小的','A small box.','A small box.'],['fast','快的','The car is fast.','Fast!'],['slow','慢的','The car is slow.','Slow!']
].map(([id,zh,phrase,question],index)=>({id,zh,phrase,audio:say(id),phraseAudio:say(phrase),questionAudio:say(question||(index>=24&&index<32?id+'!':index>=8&&index<12?'Find something '+id+'.':'Find the '+id+'.')),image:'assets/'+id+'.svg'}));
const scenes=[
 ['谁躲在花园里','小熊猫发现草丛动了动，原来是两位新朋友。','cat','dog','Look! A cat.','Hello, cat!','Look! A dog.','Hello, dog!','抱着小熊猫玩偶，找找绘本里的小猫和小狗。'],
 ['池塘边的新朋友','小熊猫抬头看看天空，又低头看看池塘。','bird','fish','Look! A bird.','Hello, bird!','Look! A fish.','Hello, fish!','和玩偶一起做小鸟飞、小鱼游的动作。'],
 ['森林里的捉迷藏','树后和花丛中，藏着两位害羞的朋友。','bear','rabbit','A bear!','Hello, bear!','A rabbit!','Hello, rabbit!','把玩偶藏起来，一起说 Hello，再把它找出来。'],
 ['池塘音乐会','小鸭和青蛙来到池塘边，准备一起打招呼。','duck','frog','Look! A duck.','Hello, duck!','Look! A frog.','Hello, frog!','抱着玩偶，学小鸭摇摆，再学青蛙跳一跳。'],
 ['小熊猫的两盒彩笔','小熊猫想给朋友画一幅画，先找两种颜色。','red','blue','Look! Red.','It’s red.','Look! Blue.','It’s blue.','带玩偶找一个红色东西和一个蓝色东西。'],
 ['花园换上新颜色','太阳照着花园，小熊猫给小花和叶子找颜色。','yellow','green','Look! Yellow.','It’s yellow.','Look! Green.','It’s green.','抱着玩偶看看家里的黄色和绿色物品。'],
 ['玩具送到朋友家','小熊猫带上球和小汽车，去找月饼一起玩。','ball','car','Look! A ball.','It’s a ball.','Look! A car.','It’s a car.','和玩偶一起滚一滚球，或者推一推小汽车。'],
 ['一起搭一个小家','小熊猫拿来积木，给玩具熊搭一个温暖的小家。','teddy','blocks','Look! A teddy.','It’s a teddy.','Look! Blocks.','Blocks!','带着玩偶搭两块积木，或给它找一个舒服的位置。'],
 ['水果篮准备好啦','小熊猫想邀请月饼野餐，先装好两种水果。','apple','banana','Look! An apple.','I like apples.','Look! A banana.','I like bananas.','带玩偶找一个苹果或香蕉，点播放，再一起说一说。'],
 ['野餐要带什么喝的','小熊猫跑得口渴了，想找一点喝的。','milk','water','I want milk.','Milk, please.','I want water.','Water, please.','给玩偶准备一个空杯子，播放想喝的饮品。'],
 ['打开野餐盒','小熊猫打开小盒子，里面有面包和鸡蛋。','bread','egg','Look! Bread.','I like bread.','Look! An egg.','I like eggs.','和玩偶一起玩假装吃早餐，不需要真的准备食物。'],
 ['分享好吃的','小熊猫带来橙子和米饭，邀请月饼一起分享。','orange','rice','Look! An orange.','I like oranges.','Look! Rice.','I like rice.','抱着玩偶选一样喜欢的食物，听听对应的英文。'],
 ['运动会开始啦','小熊猫邀请月饼一起动起来，先跳跳，再跑跑。','jump','run','Jump!','I can jump.','Run!','I can run.','在安全空地抱着玩偶跳一下，再原地跑几步。'],
 ['慢慢走，停一停','小熊猫练习过小路，听到停就稳稳站好。','walk','stop','Walk!','I can walk.','Stop!','Stop!','家长点播放，月饼带玩偶慢慢走，听到 Stop 就停住。'],
 ['给朋友加加油','小熊猫挥挥手欢迎朋友，再拍手为大家加油。','clap','wave','Clap!','I can clap.','Wave!','I can wave.','让玩偶向家人挥挥手，然后一起拍手。'],
 ['运动后的休息','运动结束，小熊猫坐下休息，再站起来说再见。','sit','stand','Sit down.','Sit down, please.','Stand up.','Stand up, please.','让玩偶先坐好，再扶它站起来，跟着播放做动作。'],
 ['小熊猫的镜子游戏','小熊猫照照镜子，找到了自己的头和小手。','head','hand','This is my head.','Touch your head.','This is my hand.','Wave your hand.','月饼，抱着玩偶照照镜子。轻轻摸摸自己的头，再挥挥手，让玩偶也来试试。'],
 ['用眼睛看，用耳朵听','小熊猫用眼睛发现朋友，用耳朵听见问候。','eye','ear','Look! An eye.','This is my eye.','Look! An ear.','This is my ear.','月饼，指指玩偶的眼睛和耳朵，再听家长说 Hello，一起找找声音从哪里来。'],
 ['笑一笑的小脸蛋','小熊猫找到鼻子，又用嘴巴笑着打招呼。','nose','mouth','This is my nose.','Touch your nose.','This is my mouth.','Look! A mouth.','月饼，轻轻点点自己的鼻尖，再指指玩偶的嘴巴。和它笑一笑，说一声 Hello。'],
 ['伸伸手臂，动动腿','小熊猫伸伸手臂，再活动一下自己的腿。','arm','leg','This is my arm.','Touch your arm.','This is my leg.','Touch your leg.','月饼，坐下来，和玩偶一起伸伸手臂、动动腿。听听英文，再轻轻指一指。'],
 ['出门前的小衣篮','小熊猫准备出门，在衣篮里找帽子和鞋子。','hat','shoes','Look! A hat.','Put on your hat.','Look! Shoes.','These are my shoes.','月饼，帮玩偶挑一顶假装的帽子，再坐下来找找自己的一双鞋。'],
 ['给小熊猫挑衣服','小熊猫在衣柜里选出一件上衣和一条裤子。','shirt','pants','This is my shirt.','Look! A shirt.','These are my pants.','Look! Pants.','月饼，和家长一起找上衣和裤子，平放在床上，帮玩偶比一比。'],
 ['玩偶的换装邀请','小熊猫收到一条连衣裙和一双袜子，想邀请朋友试一试。','dress','socks','Look! A dress.','This is a dress.','Look! Socks.','These are my socks.','月饼，用布片给玩偶假装穿一条连衣裙，再找一双袜子摆在旁边。喜欢哪件就选哪件。'],
 ['整理衣柜的小帮手','小熊猫把外套和裙子摆好，准备送回衣柜。','coat','skirt','Look! A coat.','Put on your coat.','Look! A skirt.','This is a skirt.','月饼，和家长找找外套与裙子，可以看实物也可以看绘本。给玩偶选一件，把衣物轻轻放回去。'],
 ['小熊猫的家人相册','小熊猫打开自己的相册，介绍妈妈和爸爸。','mom','dad','Hello, Mom!','This is my mom.','Hello, Dad!','This is my dad.','月饼，抱着玩偶看看家里的照片，给小熊猫介绍照顾你的人，再说一声 Hello。'],
 ['和兄弟姐妹一起玩','小熊猫请来自己的姐妹和兄弟，准备一起玩。','sister','brother','Hello, sister!','This is my sister.','Hello, brother!','This is my brother.','月饼，用两个玩偶假装小熊猫的姐妹和兄弟，轮流向它们说 Hello。'],
 ['给长辈送一个问候','小熊猫想念家里的长辈，拿着照片向他们问好。','grandma','grandpa','Hello, Grandma!','This is my grandma.','Hello, Grandpa!','This is my grandpa.','月饼，和家长看看长辈的照片，或者用玩偶演一演，给亲近的长辈送一句 Hello。'],
 ['家人的温暖合影','小熊猫看见照片里的小宝宝，也看见陪伴自己的家人。','baby','family','Look! A baby.','Hello, baby!','This is my family.','Hello, family!','月饼，抱着玩偶和家人摆一个合影姿势。再轻轻摇摇玩偶，假装安抚小宝宝。'],
 ['给玩偶安排小角落','小熊猫找到了睡觉的小床和坐着休息的椅子。','bed','chair','Look! A bed.','This is my bed.','Look! A chair.','Sit on the chair.','月饼，和家长给玩偶铺一张假装的小床，再让它坐在椅子上休息。'],
 ['欢迎来到小熊猫家','小熊猫走到门边欢迎朋友，带他们看看小桌子。','table','door','Look! A table.','This is a table.','Look! A door.','Open the door.','月饼，用积木搭一张小桌子，再给小熊猫搭一扇门，请它来做客。'],
 ['窗边的故事时间','小熊猫看看窗外，再到沙发边准备听故事。','window','sofa','Look! A window.','Look at the window.','Look! A sofa.','Sit on the sofa.','月饼，和家长带着玩偶看看窗外，再坐到沙发上，说一声 Hello。'],
 ['留一盏小灯读故事','小熊猫找到台灯和书，准备和朋友分享一个故事。','lamp','book','Look! A lamp.','This is a lamp.','Look! A book.','Open the book.','月饼，请家长打开阅读灯，抱着玩偶选一本书。一起翻一页，说一声 Hello。'],
 ['小熊猫的收纳小店','小熊猫准备开一家收纳小店，先摆出盒子和篮子。','box','basket','Look! A box.','This is a box.','Look! A basket.','This is a basket.','和家长找一个盒子和一个篮子，放到地面上，让玩偶来选一选。'],
 ['小球藏到哪里啦','小熊猫把小球放进盒子，又拿出来放到盒子上。','in','on','In the box.','The ball is in the box.','On the box.','The ball is on the box.','拿一颗小球和一个盒子，先把球放进盒子里，再放到盒子上，让玩偶来找。'],
 ['换个地方找小球','小熊猫发现小球到了桌子下面，又躲到了盒子后面。','under','behind','Under the table.','The ball is under the table.','Behind the box.','The ball is behind the box.','请家长把球放在桌子下面或盒子后面。月饼站在旁边指一指，请玩偶帮忙找出来。'],
 ['离盒子近一点，远一点','小熊猫把小球放得离盒子近一点，又放得远一点。','near','far','Near the box.','The ball is near the box.','Far from the box.','The ball is far from the box.','在地面放好盒子，把球放在盒子旁边，再放远一些。抱着玩偶看看，哪一次更近。'],
 ['打开天气小窗','小熊猫翻开天气绘本，一页是晴天，一页是雨天。','sunny','rainy','It’s sunny.','Sunny!','It’s rainy.','Rainy!','和玩偶看看窗外，或翻翻天气绘本。晴天就伸手画太阳，雨天就用手指轻轻点出雨滴。'],
 ['云朵和风来做客','小熊猫在绘本里看见一团团云，又看见风吹动叶子。','cloudy','windy','It’s cloudy.','Cloudy!','It’s windy.','Windy!','用手比一比圆圆的云，再轻轻摆动玩偶的小手，假装叶子被风吹动。'],
 ['今天穿什么呢','小熊猫看看天气卡，热的时候想扇扇风，冷的时候想围围巾。','hot','cold','It’s hot.','Hot!','It’s cold.','Cold!','用手给玩偶轻轻扇风，再用小布片给它围一条假装的围巾。边玩边听两个天气词。'],
 ['雪花和彩虹相册','小熊猫拿出旅行相册，里面有雪花，也有雨后的彩虹。','snowy','rainbow','It’s snowy.','Snowy!','Look! A rainbow.','A rainbow!','用手指在空中画小雪花，再和玩偶一起画一道大大的彩虹。'],
 ['朋友日的水果篮','小熊猫准备朋友日的苹果，想请月饼帮忙数一数。','one','two','One apple.','One apple, please.','Two apples.','Two apples, please.','月饼，和家长给玩偶摆一个苹果，再摆两个苹果，也可以用积木假装。'],
 ['给朋友分玩具','小熊猫把球和汽车带来，想为朋友准备一样多的玩具。','three','four','Three balls.','Three cars.','Four balls.','Four cars.','月饼，抱着玩偶和家长一起数三件、四件玩具，轻轻指一个，数一个。'],
 ['点心盘里有几个','朋友们带来鸡蛋，小熊猫要把点心盘准备好。','five','six','Five eggs.','Five apples.','Six eggs.','Six apples.','月饼，用积木假装点心，给玩偶摆五个，再摆六个，和家长一起慢慢数。'],
 ['积木小路准备好啦','小熊猫想用积木搭一条通往朋友日的小路。','seven','eight','Seven blocks.','Seven blocks, please.','Eight blocks.','Eight blocks, please.','月饼，和家长给玩偶摆七块、八块积木，数量不够就看图片一起数。'],
 ['小熊猫的心情线索','小熊猫找不到喜欢的玩具，月饼来陪它找一找。','happy','sad','I’m happy.','The cat is happy.','I’m sad.','The cat is sad.','月饼，抱着玩偶，演一演开心和难过的样子，想说什么都可以告诉家长。'],
 ['朋友现在需要什么','小熊猫和朋友玩过游戏，有的肚子饿，有的口渴。','hungry','thirsty','I’m hungry.','The rabbit is hungry.','I’m thirsty.','The dog is thirsty.','月饼，拿空盘和空杯，听听玩偶想吃还是想喝，再假装送给它。'],
 ['大小盒子的选择','小熊猫要收拾聚会用品，看看哪只盒子装得下。','big','small','A big box.','The box is big.','A small box.','The box is small.','月饼，和家长找大小不同的两个盒子，给玩偶的球和积木选一选。'],
 ['汽车慢一点，朋友近一点','朋友日要结束了，小熊猫想让玩具车慢慢送大家回家。','fast','slow','The car is fast.','Fast!','The car is slow.','Slow!','月饼，坐在地上轻轻推玩具车，一次快一点，一次慢一点，车要远离脚边。']
];
const weekInfo=[
 {title:'动物朋友',subtitle:'和小熊猫一起说 Hello',color:'sage',letters:['C','D'],theme:'forest',thumb:'cat',review:'森林朋友来聚会',task:'抱着小熊猫玩偶，给家人指认两位你喜欢的动物朋友。'},
 {title:'颜色与玩具',subtitle:'把小小世界变得缤纷',color:'peach',letters:['B','T'],theme:'playroom',thumb:'ball',review:'玩具整理小帮手',task:'抱着小熊猫玩偶，一起把两件玩具送回家。'},
 {title:'快乐野餐',subtitle:'把喜欢的味道分享给朋友',color:'yellow',letters:['A','M'],theme:'picnic',thumb:'apple',review:'月饼的野餐邀请',task:'和小熊猫玩偶摆一次假装的野餐，挑两样喜欢的食物。'},
 {title:'一起动起来',subtitle:'听一听，和小熊猫动一动',color:'blue',letters:['J','R'],theme:'meadow',thumb:'jump',review:'好朋友运动派对',task:'抱着玩偶，让家长播放两条指令，一起做动作。'},
 {title:'认识我的身体',subtitle:'看一看，听一听，照顾小小的自己',color:'peach',letters:['H','E'],theme:'playroom',thumb:'hand',review:'镜子里的小伙伴',task:'月饼，抱着玩偶和家长轮流指指身体部位。说一个，指一个，看看小熊猫还记得谁。'},
 {title:'穿衣小帮手',subtitle:'为小熊猫挑一身喜欢的衣服',color:'sage',letters:['H','S'],theme:'playroom',thumb:'hat',review:'小熊猫的衣柜派对',task:'月饼，和家长挑两件衣物放在床上，让玩偶来指一指，再一起收好。'},
 {title:'温暖的家人',subtitle:'介绍相册里陪伴我的人',color:'yellow',letters:['M','D'],theme:'picnic',thumb:'family',review:'好朋友的家人相册',task:'月饼，和玩偶一起看看绘本或照片，给亲近的人说一声 Hello。'},
 {title:'小熊猫的家',subtitle:'把熟悉的小角落编成故事',color:'blue',letters:['B','C'],theme:'playroom',thumb:'book',review:'欢迎来到月饼家',task:'月饼，请家长陪你，抱着玩偶看看家里的两个小角落。给它指指床、椅子或书。'},
 {title:'小球在哪里',subtitle:'和小熊猫一起找位置',color:'sage',letters:['B','I'],theme:'playroom',thumb:'in',focusWords:['box','basket','in','on','under','behind','near','far'],review:'小熊猫的寻找路线',task:'月饼，让家长摆好盒子和球，轮流说位置、指位置，再让玩偶来找一找。'},
 {title:'天气来做客',subtitle:'把窗外的发现带进故事',color:'blue',letters:['S','R'],theme:'meadow',thumb:'sunny',focusWords:['sunny','rainy','cloudy','windy','hot','cold','snowy','rainbow'],review:'小熊猫的天气相册',task:'月饼，和玩偶翻天气绘本，选两种喜欢的天气，用动作或画画介绍给家长。'},
 {title:'朋友日的数量小帮手',subtitle:'数一数，为熟悉的朋友准备好',color:'peach',letters:['O','T'],theme:'picnic',thumb:'two',focusWords:['one','two','three','four','five','six','seven','eight'],review:'月饼的朋友日准备站',task:'月饼，和家长给玩偶选两种数量的积木或玩具，数清楚，再递给它。'},
 {title:'好朋友的感受和选择',subtitle:'表达需要，照顾朋友，发现不同',color:'yellow',letters:['H','S'],theme:'forest',thumb:'happy',focusWords:['happy','sad','hungry','thirsty','big','small','fast','slow'],review:'好朋友的庆祝会',task:'月饼，抱着玩偶，选一次食物或水，再给它找一个合适的盒子，演演今天的故事。'}
];
const lessons=[];
for(let w=0;w<weekInfo.length;w++){
 const week=weekInfo[w];
 for(let d=0;d<5;d++){
  const index=w*5+d,review=d===4,s=review?null:scenes[w*4+d];
  const ids=review?(week.focusWords||vocabulary.slice(w*8,w*8+8).map(x=>x.id)):s.slice(2,4);
  const title=review?week.review:s[0],task=review?week.task:s[8];
  const intro=review?`月饼，我是你的好朋友小熊猫。今天我们把这周的故事再玩一遍吧。`:`月饼，${s[1].replaceAll('小熊猫','我').replaceAll('月饼','你')}今天和我一起玩吧。`;
  const frameWords=review?[ids[0],ids[2],ids[4],ids[6]]:[ids[0],ids[0],ids[1],ids[1]];
  const frameTexts=review?frameWords.map(id=>vocabulary.find(x=>x.id===id).phrase):s.slice(4,8);
  const captions=review?['朋友们又见面啦','你还记得它吗','把熟悉的声音找出来','和月饼一起再说一次']:[s[1],'月饼，听听小熊猫怎么说','故事里又出现了新发现','一起帮小熊猫完成今天的小任务'];
  const reviewIndices=[index-1,index-3,index-7].filter(i=>i>=0),reviewWords=[...new Set(reviewIndices.flatMap(i=>lessons[i].newWords))];
  const knownWords=[...new Set([...lessons.flatMap(l=>l.newWords),...ids])];
  const lesson={id:`w${w+1}-d${d+1}`,number:index+1,week:w+1,day:d+1,title,review,theme:week.theme,description:review?'把这一周的发现串成一个故事。':s[1],newWords:review||week.practice?[]:ids,words:ids,warmupWords:ids,knownWords,reviewWords,goal:review?'在不同场景中听懂熟悉的词和表达。':`${week.practice?'复用熟悉的表达，听懂并指认':'听懂并指认'}${ids.map(id=>vocabulary.find(x=>x.id===id).zh).join('和')}，尝试跟说一句。`,introAudio:say(intro,'zh'),intro,task,taskAudio:say(`谢谢月饼陪我一起玩！${task}`,'zh'),frames:frameWords.map((word,i)=>({word,text:frameTexts[i],caption:captions[i],audio:say(frameTexts[i])})),letters:review?[]:ids.map(word=>({letter:word[0].toUpperCase(),word,audio:say(word[0].toUpperCase()+'.')}))};
  if(week.practice)lesson.practice=true;
  lessons.push(lesson);
 }
}
upgradeStories(lessons,vocabulary,say);
arrangeStoryStages(lessons,say);
const prompts={
 firstMeet:['你好呀，月饼！我是小熊猫，我是月饼的好朋友。今天，我们一起去认识小动物吧！','zh'],hello:['Hello!','en'],goodbye:['Goodbye!','en'],warmup:['月饼，你来啦！点一点熟悉的朋友，听听它怎么说。','zh'],learn:['月饼，小耳朵准备好了吗？图片会跟着声音亮起来，我们一起听三遍，再说一句。','zh'],story:['我们一起看看，故事里发生了什么。','zh'],game:['月饼，帮我找找吧。先听声音，再点图片。','zh'],retry:['我们再听一次，一起找找看。','zh'],correct:['找到了！谢谢你帮我。','zh'],speak:['轮到月饼啦。先听我说，再点小麦克风，说完就可以听听自己的声音。不想录也可以只跟着说。','zh'],afterSpeak:['谢谢月饼愿意试试看。你可以听听自己的声音，也可以再听一遍我的示范。','zh'],task:['现在抱上你的小熊猫，我们一起到家里找一找、玩一玩吧。','zh'],complete:['月饼，今天和你一起玩真开心！送你一张小贴纸。下次我们再一起发现新故事。','zh'],letter:['看看字母，再听听熟悉的单词，它们的开头是什么声音呢？','zh']
};
const promptData=Object.fromEntries(Object.entries(prompts).map(([key,[text,lang]])=>[key,{text,audio:say(text,lang)}]));
const variations={
 warmup:['月饼，我准备了一个小发现，想和你一起看看。点点今天的图片吧。','嗨，月饼！抱抱你的小熊猫，今天的故事就要开始啦。','好朋友见面啦！月饼，我们先听听今天要认识的声音。','月饼，今天想和我一起发现什么呢？点一点图片，听听看。'],
 learn:['月饼，今天的图片要轮流说话啦。听三遍，再听一句，喜欢哪个也可以点一下。','我们给图片配上声音。亮起来的是正在说话的朋友，听完一个再换另一个。','小耳朵准备好了吗？我说一遍，你可以听，也可以跟着说。'],
 story:['故事要开始啦！月饼，和我一起看看这次的小发现。','我把今天的发现编成了一个小故事。月饼，来听听吧。','把小熊猫抱好，我们一起走进今天的故事。'],
 game:['月饼，听听我在找什么。听清楚后，点一下对应的图片。','小耳朵来帮忙！先听一个声音，再帮我找到它。','我们来玩找一找。月饼，听完再点，不着急。'],
 retry:['没关系，我们一起再听清楚一点，然后找一找。','再给小耳朵一次机会吧。我再说一遍，你慢慢找。','先别着急点，听听这个声音，再看看图片。'],
 correct:['就是这个声音！月饼，谢谢你帮我找到它。','找到啦，我们一起完成了这个小任务。','对上啦！和月饼一起找东西真开心。'],
 speak:['月饼，听听我是怎么说的。想留下自己的声音，就点一下小麦克风，录完再听一听。','我们来轮流说一说。我先说，接下来你也可以录一句，听听自己的声音。','小熊猫说完啦，月饼可以跟着说。想听到自己说话，就试试小麦克风吧。'],
 afterSpeak:['谢谢月饼愿意试一试。想再练一遍，我就在这里陪你听。','和好朋友一起练习真开心。想听自己的声音，就点一下回放。','我们慢慢说，慢慢听，每一次尝试都算数。'],
 task:['月饼，把真实的小熊猫玩偶抱过来吧。我们把今天的小发现带进家里。','现在换家里的小熊猫来陪你玩！请家长一起看看今天的小任务。','我们离开屏幕玩两分钟。月饼，带上小熊猫，和家人一起试试看。'],
 complete:['月饼，我们又一起完成了一次小冒险！这张贴纸送给你，今天就好好休息吧。','今天和月饼一起玩得很开心。收好你的小贴纸，我们下次再见。','谢谢月饼陪我发现新东西。抱抱你的小熊猫，今天的小故事就到这里啦。'],
 reviewQuiz:['接下来，和以前见过的朋友再打个招呼吧。先听听，要找什么呢？','我们再听两个以前学过的声音。月饼，和我一起找一找吧。','现在换熟悉的老朋友出场，听听看，你还认识它吗？'],
 rest:['月饼，先抱抱小熊猫，伸伸小手吧。想继续的时候，我们再回到故事里。','小熊猫想歇一小会儿。和我一起动动肩膀，慢慢呼一口气，再选想不想继续玩。','让小耳朵休息一下，看看身边的小东西吧。月饼准备好了，随时可以回来接着玩。']
};
const promptVariants=Object.fromEntries(Object.entries(variations).map(([key,texts])=>[key,[...(promptData[key]?[promptData[key]]:[]),...texts.map(text=>({text,audio:say(text,'zh')}))]]));
promptVariants.warmup.forEach((cue,index)=>{cue.title=['你好呀，月饼！','今天有个小发现','小熊猫准备好啦','好朋友，又见面啦','一起开始新故事'][index];});
promptData.reviewQuiz=promptVariants.reviewQuiz[0];
promptData.rest=promptVariants.rest[0];
const interactions=[
 {id:'friendly-hello',title:'好朋友怎么打招呼',text:'月饼，小熊猫来找你玩啦！你想怎样和我打招呼？',choices:[
  {id:'wave',label:'挥挥小手',image:'assets/wave.svg',reply:'好呀，我们一起挥挥小手。我也向月饼问声好！'},
  {id:'hug',label:'抱抱玩偶',image:'assets/mascot.svg',reply:'那就抱抱你的小熊猫吧。我在这里，陪月饼一起发现新故事。'}
 ]},
 {id:'little-movement',title:'和小熊猫动一动',text:'小熊猫想动一动，月饼想陪我慢慢走，还是拍拍手？',choices:[
  {id:'walk',label:'慢慢走几步',image:'assets/walk.svg',reply:'我们在家长身边慢慢走几步，再带着小熊猫回到小屋。'},
  {id:'clap',label:'轻轻拍拍手',image:'assets/clap.svg',reply:'拍拍手，停一停，再拍拍手。我们的朋友节奏真好玩。'}
 ]},
 {id:'listening-friend',title:'小耳朵的邀请',text:'月饼，接下来你想听小熊猫示范，还是和我轮流说一句？',choices:[
  {id:'listen',label:'先听一听',image:'assets/ear.svg',reply:'好呀，小耳朵先来帮忙。回到图片上，想听哪一个就点哪一个。'},
  {id:'say',label:'轮流说一句',image:'assets/mouth.svg',reply:'那我们来轮流说。我先示范，月饼想说的时候，就接上自己的声音。'}
 ]},
 {id:'story-pal',title:'故事里的小伙伴',text:'小熊猫想请月饼当故事里的小伙伴。你想学小鸟飞，还是学小鱼游？',choices:[
  {id:'bird',label:'学小鸟飞',image:'assets/bird.svg',reply:'伸开小手，轻轻扇一扇。我们的小鸟朋友飞来打招呼啦。'},
  {id:'fish',label:'学小鱼游',image:'assets/fish.svg',reply:'把两只小手合起来，轻轻摆一摆。小鱼朋友游过来找我们啦。'}
 ]},
 {id:'plush-company',title:'给玩偶一点陪伴',text:'月饼，看看身边的小熊猫。现在想给它一个拥抱，还是和它碰一碰小手？',choices:[
  {id:'hug',label:'给它一个拥抱',image:'assets/mascot.svg',reply:'把小熊猫轻轻抱在怀里吧。好朋友就在身边，陪你慢慢玩。'},
  {id:'high-five',label:'碰一碰小手',image:'assets/hand.svg',reply:'伸出你的小手，和玩偶轻轻碰一下。等会儿我们继续一起找声音。'}
 ]},
 {id:'tiny-pause',title:'选一个小小休息',text:'小熊猫想陪月饼歇一会儿。你想伸伸手，还是安静听听身边的声音？',choices:[
  {id:'stretch',label:'伸伸小手',image:'assets/arm.svg',reply:'把小手慢慢伸开，再轻轻放下来。想继续时，我们就回到故事里。'},
  {id:'listen-around',label:'听身边的声音',image:'assets/ear.svg',reply:'先安静听一小会儿，看看哪个声音来做客。小熊猫等你准备好再一起玩。'}
 ]}
].map(interaction=>({...interaction,audio:say(interaction.text,'zh'),choices:interaction.choices.map(choice=>({...choice,replyAudio:say(choice.reply,'zh')}))}));
const data={version:'2.0.1',child:'月饼',mascot:'小熊猫',durationMinutes:15,totals:{weeks:weekInfo.length,lessons:lessons.length,words:vocabulary.length,reviewLessons:weekInfo.length},audio:{english:{accent:'en-US',engine:'Kokoro',voice:'af_heart'},chinese:{namespace:'natural-v1',engine:'Microsoft Edge neural TTS',voice:'zh-CN-XiaoxiaoNeural',generatedOnline:true,runtimeOnline:false,offline:true}},vocabulary,weeks:weekInfo.map((w,i)=>({...w,number:i+1})),lessons,prompts:promptData,promptVariants,interactions,roadmap:[{weeks:'01—04',title:'熟悉的小世界',detail:'动物朋友、颜色玩具、野餐与身体动作',available:true},{weeks:'05—06',title:'照顾自己',detail:'身体与衣物：听懂日常生活的小指令',available:true},{weeks:'07—08',title:'温暖的家',detail:'家人与居家：表达熟悉的人和物',available:true},{weeks:'09—10',title:'出门去发现',detail:'位置与天气：在小场景里听懂短句',available:true},{weeks:'11—12',title:'我会帮助好朋友',detail:'数量准备、表达感受与需求、比较大小和快慢',available:true}]};
await mkdir(new URL('dist/',root),{recursive:true});
await writeFile(new URL('dist/curriculum.json',root),JSON.stringify(data,null,2));
await writeFile(new URL('scripts/audio-requests.json',root),JSON.stringify([...requests.values()],null,2));
console.log(`${lessons.length} lessons, ${vocabulary.length} words, ${requests.size} audio clips`);
