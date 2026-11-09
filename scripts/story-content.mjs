// Original six-beat extensions. The first ten weeks keep their vocabulary,
// setting and lesson identity; the first twenty also retain all four old lines.
// Scenes and tasks are data: the offline player does not generate stories.
const P=(recall,n,types=['choose','deliver'])=>({recall,n,types});
const plans={
 'w1-d1':P([],['月饼，草丛动了，我们去找新朋友吧。','小猫探出头，却不敢走到小路上。','点点小猫，邀请它和我们一起走。','小狗也来了，可它走到了另一边。','找到小狗，把它请到小猫身边。','两个朋友见面啦，我们一起说声你好。'],['reveal','choose']),
 'w1-d2':P(['cat','dog'],['还记得小猫和小狗吗？今天去池塘找朋友。','小鸟飞来了，想请我们听它唱歌。','点点天上的小鸟，和它打个招呼。','水面冒出泡泡，小鱼还没见到新朋友。','找到小鱼，请它游过来听小鸟唱歌。','月饼帮它们见面了，池塘里热闹起来。'],['reveal','choose']),
 'w1-d3':P(['bird','fish','cat'],['小鸟送来邀请，小熊猫要找森林里的朋友。','树边露出圆耳朵，小熊还在害羞呢。','请小熊出来，我们一起说声你好。','小兔听见问候，也从花丛边探出头。','点点小兔，邀请它站到小熊旁边。','月饼找齐朋友啦，大家约好一起去池塘。'],['reveal','choose']),
 'w1-d4':P(['bird','fish','rabbit'],['月饼，池塘音乐会缺了两位小伙伴。','小鸟开唱了，小鸭却还在远处摇摇摆摆。','找到小鸭，请它来听音乐会。','小鱼游过来，可青蛙还没发现大家。','请青蛙加入，让它和小鸭一起打招呼。','池塘朋友都到了，小熊猫和大家一起听歌。'],['choose','choose']),
 'w1-d5':P(['cat','dog','bird','fish'],['月饼，森林朋友来聚会，我们来当小主人。','小猫到了，后面还有没找到位置的朋友。','先请小猫和我们一起迎接大家。','小熊和小兔到齐了，小鸭还在找入口。','把小鸭请到朋友身边，聚会就能开始。','八位朋友都来啦，下次一起布置玩具小屋。'],['choose','choose']),
 'w2-d1':P(['cat','dog','bird'],['小猫和小狗想要门牌，我们来选颜色。','小熊猫拿出彩笔，小猫还没挑到红色。','点出红色，把它送给小猫做门牌。','小鸟也来帮忙，小狗还在等蓝色。','选好蓝色，让小狗也有自己的门牌。','月饼把颜色送对啦，两位朋友都找到家。'],['color','color']),
 'w2-d2':P(['bird','fish','red','blue'],['昨天的小屋有了门牌，今天给池塘添颜色。','小鸟想画亮亮的小花，却找不到黄色。','找到黄色，让池塘边的小花亮起来。','小鱼来看画了，叶子却还没有绿色。','把绿色送到画里，给小鱼添一片叶子。','月饼看，花和叶子都有颜色，朋友开心极了。'],['color','color']),
 'w2-d3':P(['rabbit','red','blue'],['月饼，小兔等我们送玩具，一起出发吧。','小熊猫抱来一颗球，可小兔没看见它。','把球送给小兔，和它一起玩一会儿。','球送到了，小汽车却落在另一边。','再找到小汽车，请小熊猫带上它。','两件玩具都送到了，下次给玩具熊搭小家。'],['deliver','deliver']),
 'w2-d4':P(['ball','car','dog'],['小狗带着球来做客，我们给玩具熊搭小家。','玩具熊坐在旁边，还没有舒服的位置。','先把玩具熊请到我们准备的小角落。','小汽车停好了，小家却还少几块积木。','选出积木，把它们送给小熊猫搭小家。','月饼帮忙搭好了，玩具熊可以和朋友一起住。'],['choose','deliver']),
 'w2-d5':P(['cat','dog','ball','car'],['月饼，朋友玩过的玩具散开了，帮忙收好吧。','球和小汽车排着队，玩具熊却找不到家。','先认出玩具熊，把它送回小角落。','颜色卡也收好了，积木还在小路边。','再把积木送回来，给小屋搭好最后一块。','玩具和颜色都归位，下次带朋友去野餐。'],['deliver','deliver']),
 'w3-d1':P(['rabbit','red','ball'],['月饼，我们邀请小兔野餐，先准备水果。','红球收好了，苹果却还没装进野餐篮。','把苹果送来，小兔就能尝到喜欢的水果。','苹果准备好了，小熊猫又想起香蕉。','再找到香蕉，把它放到苹果旁边。','水果齐了，下次还要给朋友准备喝的。'],['deliver','deliver']),
 'w3-d2':P(['dog','apple','banana'],['小狗带水果来了，我们再准备一点喝的。','它跑得有点累，小熊猫先拿来牛奶。','把牛奶送给小熊猫，听听它怎样请求。','小狗看看苹果，又想喝一点水。','找到水，送到小狗身边让它休息一下。','月饼照顾好朋友啦，饮品可以带去野餐。'],['deliver','deliver']),
 'w3-d3':P(['bear','milk','water'],['小熊带上水和牛奶，野餐盒还没装满。','面包留在外面，小熊猫等着把它带走。','选出面包，帮小熊猫装好这一份。','小熊准备好了，餐盒里还缺一个鸡蛋。','找到鸡蛋，把它放到面包旁边。','月饼把午餐装好了，我们约朋友一起分享。'],['deliver','deliver']),
 'w3-d4':P(['duck','bread','egg'],['小鸭带来面包和鸡蛋，还想分享新食物。','小熊猫拿出橙子，小鸭还没看见。','把橙子送过来，邀请朋友尝一尝。','橙子分好了，旁边还有一份米饭。','找到米饭，给等着的小鸭准备好。','月饼和朋友把食物摆好了，明天一起野餐。'],['deliver','deliver']),
 'w3-d5':P(['rabbit','apple','water','bread'],['月饼，野餐开始前，朋友们还有小请求。','小兔看着水果，小熊猫想先拿到苹果。','选出苹果，把它送给小熊猫。','大家坐好了，小狗还在等一份水。','找到水，让小狗也能安心参加野餐。','食物和饮品都到了，朋友们约好一起运动。'],['deliver','deliver']),
 'w4-d1':P(['rabbit','ball','apple'],['月饼，小兔收好苹果，邀请我们参加运动会。','球停在小路边，小兔先示范轻轻跳。','听听跳的指令，帮小熊猫选对动作。','小兔跳完了，想跑到朋友那边送邀请。','再选跑的动作，让小熊猫跟上小兔。','大家都接到邀请，下次练习走和停。'],['choose','choose']),
 'w4-d2':P(['rabbit','red','green','run'],['跑过的小兔回来了，今天慢慢走过小路。','小熊猫等着出发，先听慢慢走的指令。','选对走的动作，陪小熊猫走到路中央。','前面亮起红色提示，大家需要停下来。','听到停，就选停的动作，稳稳站好。','月饼帮大家安全走完，接下来迎接运动员。'],['choose','choose']),
 'w4-d3':P(['cat','dog','walk','stop'],['小猫和小狗走到了，我们给运动员加油。','朋友刚表演完，小熊猫想先拍拍手。','选出拍手，让朋友知道我们在为它加油。','小狗停在远处，还没看见迎接它的小熊猫。','找到挥手的动作，请它走过来。','月饼的问候送到了，大家准备一起休息。'],['choose','choose']),
 'w4-d4':P(['bear','clap','wave','water'],['小熊挥挥手，运动后和我们一起歇一会儿。','水放好了，小熊猫需要先坐下来。','选出坐下的动作，陪小熊猫安静休息。','大家休息好了，朋友准备挥手告别。','听听站起来的指令，让小熊猫站稳。','月饼陪朋友完成运动，明天再玩运动派对。'],['choose','choose']),
 'w4-d5':P(['rabbit','ball','water','wave'],['月饼，好朋友运动派对需要一位小指挥。','小兔抱着球等着，先请大家跳一跳。','听指令选动作，让小熊猫加入跳跃队。','喝过水以后，朋友们想拍手庆祝。','再选出拍手，让小熊猫和大家一起加油。','走走停停都完成了，最后挥手和朋友告别。'],['choose','choose']),
 'w5-d1':P(['wave','red','ball'],['月饼，红球停在镜子边，小熊猫想照照自己。','它看见头上的毛，却找不到镜子里的头。','找到头的图片，让小熊猫认出自己。','小熊猫认出头了，又想和镜子里的朋友挥手。','选出小手，陪它一起挥挥手。','镜子朋友也挥手啦，身体的小发现开始了。'],['choose','choose']),
 'w5-d2':P(['bird','head','hand'],['小鸟飞到镜子边，和小熊猫玩看和听。','小熊猫想看看小鸟，先找到眼睛。','选出眼睛，让它知道用哪里看朋友。','小鸟唱起歌，可小熊猫的小耳朵还没准备好。','选出耳朵，一起安静听听小鸟的声音。','月饼帮它分清看和听，再挥手送别小鸟。'],['choose','choose']),
 'w5-d3':P(['rabbit','eye','ear'],['小兔送来脸部拼图，小熊猫想拼出笑脸。','眼睛和耳朵摆好了，鼻子还没放进去。','选出鼻子，把笑脸中间的小空位补好。','鼻子找到了，脸蛋还缺一张会笑的嘴巴。','找到嘴巴，让小熊猫对小兔笑一笑。','月饼拼好了笑脸，朋友也笑着说声你好。'],['choose','choose']),
 'w5-d4':P(['bear','hand','nose','sit'],['小熊坐在身边，邀请小熊猫伸展身体。','小熊猫想伸出手臂，却先拿错了图片。','选出手臂，陪小熊猫慢慢伸一伸。','手臂放下来，小熊又想活动一下腿。','找到腿的图片，和小熊猫坐着动一动。','月饼和朋友伸展完了，身体感觉更舒服。'],['choose','choose']),
 'w5-d5':P(['head','eye','arm','leg'],['月饼，镜子游戏开场，小熊猫要准备晨间操。','它想挥手打招呼，身体卡片却混在一起。','先找到手，让小熊猫挥手迎接朋友。','朋友到齐了，小熊猫想伸展一下手臂。','找出手臂，陪它完成这一个动作。','从头到脚都认识了，明天给小熊猫挑衣服。'],['choose','choose']),
 'w6-d1':P(['head','leg','red','rabbit'],['小兔来约出门，小熊猫还没穿戴整齐。','它摸摸自己的头，发现少了一顶帽子。','把帽子送过来，帮小熊猫准备出发。','帽子戴好了，小熊猫的脚边还空着。','再找到鞋子，把它们送到小熊猫身边。','月饼帮它准备好了，小兔邀请它明天再来。'],['deliver','deliver']),
 'w6-d2':P(['hat','shoes','blue','hand'],['帽子和鞋子摆好了，小熊猫还想挑一身衣服。','它拿起蓝色上衣，想请我们帮忙选出来。','把上衣送过来，让小熊猫比一比。','上衣合适了，裤子却留在另一边。','找到裤子，和上衣一起送给小熊猫。','月饼把衣服配齐了，小熊猫挥手说谢谢。'],['deliver','deliver']),
 'w6-d3':P(['rabbit','shirt','pants','yellow'],['小兔带着衣物来做客，邀请小熊猫换装。','一条连衣裙摆好了，却还没送到朋友手中。','把连衣裙送过来，让朋友自己挑喜欢的。','上衣和裤子收好了，袜子还落在外面。','找到袜子，把它们送回换装小角落。','月饼帮忙收齐衣物，朋友们约好一起整理。'],['deliver','deliver']),
 'w6-d4':P(['dress','socks','green','stand'],['小熊猫站在衣物旁，想把衣柜整理好。','连衣裙收好了，外套还需要送回来。','选出外套，把它放进整理好的位置。','袜子也归位了，裙子还留在另一边。','找到裙子，帮小熊猫收好最后一件。','月饼把衣物整理好了，明天邀请朋友来选。'],['deliver','deliver']),
 'w6-d5':P(['hat','shoes','shirt','coat'],['月饼，小熊猫的衣柜派对开始，朋友来挑衣服。','小兔准备出门，想先找到自己的帽子。','把帽子送回来，让小熊猫帮小兔试一试。','帽子找到了，小熊还在等自己的外套。','再选出外套，帮小熊猫把衣物送到手中。','衣柜整整齐齐，下次给朋友介绍小熊猫的家人。'],['deliver','deliver']),
 'w7-d1':P(['hat','shoes','book'],['月饼，小熊猫穿戴好了，想给你看家人相册。','相册里少了一张照片，妈妈还没找到位置。','认出妈妈的照片，把它请回相册。','妈妈回到相册了，爸爸的照片还放在外面。','再找到爸爸，让两张照片靠在一起。','家人的照片齐了，下次介绍一起玩的小伙伴。'],['choose','choose']),
 'w7-d2':P(['mom','dad','ball','car'],['妈妈和爸爸翻开相册，姐妹兄弟也想一起玩。','姐妹想和我们玩球，却还没走到朋友身边。','找到姐妹，邀请她来和小熊猫一起玩。','球滚过去了，兄弟带着汽车等在另一边。','再请兄弟过来，让大家轮流分享玩具。','月饼帮家人聚到一起，下次给长辈送问候。'],['choose','choose']),
 'w7-d3':P(['sister','brother','apple','water'],['姐妹兄弟准备了苹果，想给长辈送问候。','小熊猫找出照片，先请我们认一认奶奶。','找到奶奶的照片，向她说声你好。','问候送到了，爷爷还在另一张照片里。','再找到爷爷，让照片里的家人团聚。','月饼认出两位长辈啦，苹果和水也准备好了。'],['choose','choose']),
 'w7-d4':P(['mom','dad','grandma','grandpa'],['爷爷奶奶都到了，小熊猫想拍一张温暖合影。','妈妈抱着小宝宝，小熊猫还没找到它。','点出小宝宝，轻轻向它说声你好。','爸爸站好了，可合影里还没有全家人。','找到全家人的图片，让大家一起进入合影。','月饼帮忙拍好了，家人的问候留在相册里。'],['choose','choose']),
 'w7-d5':P(['mom','dad','baby','family'],['月饼，小熊猫打开相册，想办一次家人聚会。','爸爸准备迎客，妈妈的照片还没有摆好。','先找到妈妈，让她和小熊猫一起迎接大家。','兄弟姐妹到了，奶奶还在另一页相册里。','再请奶奶过来，把温暖的问候送给她。','全家人都见面啦，下次给来做客的人布置小屋。'],['choose','choose']),
 'w8-d1':P(['teddy','baby','sit','stand'],['月饼，玩具熊来做客，我们给它准备休息角。','小宝宝睡着了，玩具熊却还没找到小床。','找出小床，让玩具熊有地方安静躺一会。','小床准备好了，小熊猫想坐在旁边陪它。','再找出椅子，给小熊猫安排一个位置。','玩具熊和小熊猫都安顿好了，明天请家人来。'],['choose','choose']),
 'w8-d2':P(['dad','mom','chair','apple'],['爸爸妈妈带苹果来做客，小熊猫准备迎接。','椅子摆好了，可苹果还没有地方放。','找出桌子，让小熊猫把苹果摆上去。','桌子准备好了，门外传来朋友的问候。','再找到门，请小熊猫把门打开。','月饼帮忙迎来了家人，小屋里热闹起来。'],['choose','reveal']),
 'w8-d3':P(['cat','door','table','sit'],['小猫进门做客，想和小熊猫找个舒服的地方。','桌边没有小猫，它正看着窗外的小鸟。','找到窗户，和小熊猫一起看看小猫在哪里。','窗外看完了，小猫想坐下来听一段故事。','再找到沙发，请小猫和小熊猫一起坐好。','月饼给朋友找到位置，下次准备阅读的灯和书。'],['choose','choose']),
 'w8-d4':P(['sofa','window','mom','chair'],['妈妈坐在沙发边，想和小熊猫分享一本书。','窗边暗下来，阅读角还少一盏亮亮的灯。','找出台灯，让小熊猫把阅读角照亮。','灯亮了，小熊猫想读的书还放在另一边。','再找到书，把它送到小熊猫身边。','月饼准备好了，朋友们可以安静听故事。'],['choose','deliver']),
 'w8-d5':P(['cat','teddy','apple','water'],['月饼，朋友来参观小屋，我们做一次小主人。','小猫想休息，小熊猫先帮它找张小床。','选出小床，让小猫知道休息角在哪里。','苹果和水摆好了，玩具熊想看看阅读角。','再找到书，请小熊猫和玩具熊一起翻开。','朋友参观完小屋，下次一起把东西整理好。'],['choose','deliver']),
 'w9-d1':P(['ball','car','red','cat'],['月饼，红球和汽车散开了，我们开一家收纳小店。','小熊猫拿来盒子，可小猫挡住了它。','找到盒子，把箱盖打开看看能装什么。','球准备收好了，汽车还需要一个篮子。','再找到篮子，把它送到小熊猫身边。','收纳工具齐了，小熊猫约你明天玩捉迷藏。'],['reveal','choose']),
 'w9-d2':P(['box','cat','red','ball'],['昨天认识的盒子还在，月饼来和我捉迷藏吧。','小熊猫钻进盒子，环纹尾巴还露在外面。','点开箱盖，看看小熊猫是不是躲在里面。','小猫也来玩，轻轻跳到了盒子上面。','听听位置提示，找到躲在里面的小熊猫。','小猫下来，小熊猫出来，把熟悉的红球递给你。'],['reveal','position']),
 'w9-d3':P(['ball','table','box','cat'],['红球又滚走了，小熊猫和小猫顺着线索去找。','小猫看看桌面，球却躲到桌子下面。','听位置提示，点出桌子下面的红球。','球找到了，又轻轻滚到盒子的后面。','再听提示，找到盒子后面露出的球。','月饼两次都找到啦，小熊猫把球抱回身边。'],['position','position']),
 'w9-d4':P(['ball','box','rabbit','walk'],['小兔来借球，小熊猫想比较盒子旁边的距离。','一颗球放得近，小兔一下子就看见它。','听近的提示，选出离盒子近的球。','另一颗球放远了，小熊猫要慢慢走过去。','再听远的提示，选出离盒子远的球。','月饼帮忙分清远近，小兔把球借去一起玩。'],['position','position']),
 'w9-d5':P(['red','ball','cat','table'],['月饼，小猫送来寻找路线，我们去找红球。','盒子和篮子摆好了，第一条线索在盒子里面。','选对里面的位置，打开第一处寻找线索。','线索指向桌子下面，小熊猫走过去查看。','再找到桌子下面的球，让它回到朋友手中。','红球找到啦，明天看看什么天气适合出去玩。'],['position','position']),
 'w10-d1':P(['hat','coat','ball','window'],['月饼，小熊猫打开天气小窗，想带球去野餐。','窗外有太阳，小熊猫先看清晴天的样子。','选出晴天，让小熊猫戴好帽子准备出发。','小雨忽然来了，外套还摆在小屋里。','再认出雨天，提醒小熊猫回屋拿好外套。','天气变了计划也能变，朋友约好先在屋里玩。'],['choose','choose']),
 'w10-d2':P(['cloudy','hat','window','bird'],['小鸟飞到窗边，小熊猫想看看云和风。','一团团云飘来，把小窗外的天空遮住。','找到多云的图片，和小熊猫一起看看。','云还在飘，风却把小熊猫的帽子吹偏了。','再认出有风的天气，帮它把帽子拿稳。','月饼提醒得及时，小熊猫和小鸟回屋等风小些。'],['choose','choose']),
 'w10-d3':P(['coat','water','sunny','rainy'],['小熊猫整理天气卡，还准备了外套和水。','太阳出来有点热，它想先凉快一下。','认出热的感觉，请小熊猫喝点水歇一会。','另一张卡画着冷天，小熊猫想起自己的外套。','再认出冷的感觉，让它把外套准备好。','月饼会照顾朋友啦，冷热天气都有不同办法。'],['choose','choose']),
 'w10-d4':P(['book','coat','red','blue'],['月饼，小熊猫打开旅行相册，想分享两个发现。','一页飘着雪花，相片里的朋友穿着外套。','找到下雪的天气，看看雪花落在哪里。','翻过一页，雨后出现一道彩色的小桥。','找到彩虹，和小熊猫看看熟悉的红色蓝色。','两张相片都找到了，明天把天气相册整理好。'],['choose','choose']),
 'w10-d5':P(['hat','coat','water','ball'],['月饼，朋友们来翻天气相册，我们帮它们选计划。','小猫想带球出去，先看看晴天那一页。','认出晴天，让小熊猫把帽子准备好。','下一页刮起风，朋友们想先回温暖的小屋。','再认出有风的天气，把帽子稳稳收好。','天气相册整理好了，下次给聚会准备不同数量。'],['choose','choose']),
 'w11-d1':P(['apple','water','rabbit','basket'],['月饼，小兔带来篮子，我们准备朋友日点心。','小熊猫先要一个苹果，别一次拿太多。','选出一个，把这一份送给小熊猫。','又来了一位朋友，现在需要两个苹果。','再选出两个，让两位朋友都有自己的点心。','一个和两个都准备好了，明天再摆玩具。'],['count','count']),
 'w11-d2':P(['ball','car','one','two'],['昨天分好了苹果，今天给朋友准备玩具。','小熊猫数到三个球，想请月饼帮忙确认。','找到三个球，送到小熊猫准备的位置。','球准备好了，小汽车却需要四辆才够。','再找到四辆汽车，帮小熊猫摆成一排。','玩具数量对上了，下次我们准备更多点心。'],['count','count']),
 'w11-d3':P(['egg','apple','three','four'],['小熊猫想给更多朋友准备点心，先摆好空盘。','鸡蛋还差一点，它数了数需要五个。','找出五个鸡蛋，帮小熊猫放到一起。','这一盘齐了，另一盘要给六位朋友准备鸡蛋。','再找出六个鸡蛋，让朋友都能轮流分享。','月饼把点心准备好了，明天还要搭聚会小路。'],['count','count']),
 'w11-d4':P(['blocks','car','five','six'],['月饼，朋友日快开始，我们用积木搭一条小路。','第一段小路需要七块积木，小兔正等着帮忙。','选出七块积木，让小熊猫把这一段铺好。','第一段铺好了，接着需要八块积木搭另一段。','再找出八块积木，让小汽车能慢慢开过去。','七块和八块都齐了，明天大家一起检查聚会。'],['count','count']),
 'w11-d5':P(['apple','ball','basket','family'],['月饼，朋友们要来聚会，我们检查篮子里的数量。','小熊猫拿起苹果，先为两位朋友各留一份。','选出两个苹果，给这一桌准备点心。','点心放好了，游戏角还需要四个球。','再选出四个球，让朋友都有轮流玩的机会。','从一个到八个都练过了，接下来听听朋友的心情。'],['count','count']),
 'w12-d1':P(['cat','ball','red','family'],['月饼，小猫想分享心情，我们来听听它的故事。','它找到红球，开心得眯起了眼睛。','认出开心的表情，和小熊猫一起回应它。','球又滚远了，小猫有一点难过。','再认出难过的表情，让小熊猫陪在它身边。','小熊猫把球找回来，也记住了先听朋友的心情。'],['choose','choose']),
 'w12-d2':P(['bear','bread','water','happy'],['小熊来做客，小熊猫想先问问它需要什么。','小熊摸摸肚子，原来是肚子饿了。','认出饿的感觉，让小熊猫准备面包。','吃过面包以后，小熊又想喝一点水。','再认出口渴的感觉，让小熊猫递上水。','月饼听懂朋友的需要，小熊开心地说谢谢。'],['choose','choose']),
 'w12-d3':P(['box','red','ball','teddy'],['月饼，小熊猫收礼物，想挑大小合适的盒子。','大玩具熊在旁边，小盒子装不下它。','认出大的盒子，给玩具熊留一个舒服位置。','玩具熊安顿好了，红球只需要小小的盒子。','再认出小的盒子，让小球也有自己的家。','大小选对啦，小熊猫准备明天玩汽车游戏。'],['choose','choose']),
 'w12-d4':P(['car','rabbit','walk','stop'],['小兔带汽车来玩，小熊猫想试试不同速度。','汽车跑得很快，一下子超过了旁边的标记。','认出快的动作，看看汽车怎样向前跑。','到了朋友身边，汽车需要慢慢走才稳当。','再认出慢的动作，让汽车平稳停下来。','月饼帮它调整速度，朋友约好一起庆祝。'],['choose','choose']),
 'w12-d5':P(['family','apple','water','ball'],['月饼，好朋友庆祝会开始，我们来照顾每位朋友。','小熊摸摸肚子，它需要的不是球而是食物。','认出饿的感觉，请小熊猫准备一点苹果。','朋友吃好喝好了，小猫找回球，露出了笑脸。','再认出开心的表情，和朋友一起分享好心情。','十二周的小发现连起来了，小熊猫还会陪你重玩。'],['choose','choose'])
};

const ROLES=['goal','problem','help','change','help','resolution'];
const clone=value=>JSON.parse(JSON.stringify(value));
const obj=(id,word,x,y,size=24,z=3,extra={})=>({id,word,x,y,size,z,...extra});
const numberValue={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8};

function focusWords(lesson){
 if(!lesson.review)return lesson.words.slice(0,2);
 const special={'w1-d5':['cat','duck'],'w2-d5':['teddy','blocks'],'w3-d5':['apple','water'],'w4-d5':['jump','clap'],'w5-d5':['hand','arm'],'w6-d5':['hat','coat'],'w7-d5':['mom','grandma'],'w8-d5':['bed','book'],'w9-d5':['in','under'],'w10-d5':['sunny','windy'],'w11-d5':['two','four'],'w12-d5':['hungry','happy']};
 return special[lesson.id]||[lesson.words[0],lesson.words[4]];
}

function baseScene(lesson,plan,beat,completed=false){
 const [a,b]=focusWords(lesson),second=beat>=3,delivered=beat>=3||completed;
 const objects=[obj('panda','mascot',20,65,29,5),
  obj('first',a,delivered?37:57,delivered?66:64,delivered?21:25,3),
  obj('second',b,second?(completed?48:74):83,second?(completed?68:61):68,second?25:20,3)];
 // Prior vocabulary is part of the scene rather than a separate flash-card strip.
 plan.recall.slice(0,4).forEach((word,i)=>{
  if(word===a||word===b)return;
  const actor=['cat','dog','bird','fish','bear','rabbit','duck','frog','mom','dad','sister','brother','grandma','grandpa','baby','family','teddy'].includes(word);
  objects.push(obj('recall-'+i,word,actor?10+i*21:39+i*15,actor?34:28,actor?17:13,1));
 });
 if(lesson.review)lesson.words.filter(word=>word!==a&&word!==b&&!plan.recall.includes(word)).forEach((word,i)=>objects.push(obj('review-'+i,word,39+(i%3)*19,20+Math.floor(i/3)*18,12,1)));
 if(lesson.week===2){
  const color=beat<3?a:b;
  const painted=objects.find(o=>o.word==='ball'||o.word==='car'||o.word==='cat'||o.word==='dog');
  if(painted&&['red','blue','yellow','green'].includes(color)&&completed)painted.color=color;
  if(lesson.id==='w2-d3'){
   sceneReceiver(objects,'rabbit');
   if(completed){const toy=objects.find(o=>o.id===(second?'second':'first'));toy.x=78;toy.y=68;toy.size=18;}
  }
  if(lesson.id==='w2-d4'||lesson.id==='w2-d5'){
   const blocks=objects.find(o=>o.word==='blocks');
   if(blocks){blocks.x=completed?66:83;blocks.y=completed?74:64;blocks.size=completed?36:24;blocks.z=2;}
   const teddy=objects.find(o=>o.word==='teddy');
   if(teddy){teddy.x=completed?66:52;teddy.y=completed?58:69;teddy.z=4;teddy.size=22;}
  }
 }
 if(lesson.week===3){
  objects.push(obj('picnic-basket','basket',54,78,37,2,{open:true}));
  if(completed){const food=objects.find(o=>o.id===(second?'second':'first'));food.x=54;food.y=65;food.size=17;food.z=3;}
  if(lesson.id==='w3-d2'&&second||lesson.id==='w3-d5'&&second){sceneReceiver(objects,'dog');if(completed){const drink=objects.find(o=>o.id==='second');drink.x=78;drink.y=68;drink.z=7;}}
 }
 if(lesson.week===4){
  objects[0].pose=(beat<3?a:b);
  if(completed){objects[0].x=beat<3?38:56;objects[0].rotate=['jump','wave','clap'].includes(objects[0].pose)?-8:0;}
 }
 if(lesson.week===5){
  objects[0].pose=beat<3?'point':'wave';
  if(completed){const selected=objects.find(o=>o.id===(second?'second':'first'));selected.x=24;selected.y=49;selected.size=15;selected.z=7;objects[0].rotate=-4;}
 }
 if(lesson.week===6&&completed){
  const selected=objects.find(o=>o.id===(second?'second':'first'));
  selected.x=20;selected.y=selected.word==='hat'?38:selected.word==='shoes'||selected.word==='socks'?83:64;selected.size=selected.word==='hat'?20:17;selected.z=7;
 }
 if(lesson.week===7&&completed){const selected=objects.find(o=>o.id===(second?'second':'first'));selected.x=37;selected.y=65;objects[0].pose='wave';}
 if(lesson.week===8){
  if(completed){
   const selected=objects.find(o=>o.id===(second?'second':'first'));
   if(['bed','chair','sofa'].includes(selected.word)){selected.x=32;selected.y=74;selected.size=37;selected.z=2;objects[0].x=32;objects[0].y=56;objects[0].size=23;}
   else if(selected.word==='door'){selected.open=true;selected.x=75;selected.y=57;selected.size=34;objects[0].x=55;}
   else if(selected.word==='lamp'){selected.lit=true;selected.x=43;selected.y=51;}
   else{selected.x=36;selected.y=66;}
  }
 }
 return stageRelationships(lesson,beat,completed,{setting:lesson.theme,objects});
}

const decor=(id,asset,x,y,size,z)=>({id,asset,x,y,size,z});
// Stage direction only: props never become unintroduced answer vocabulary.
function stageRelationships(lesson,beat,completed,scene){
 const objects=scene.objects,panda=objects.find(o=>o.id==='panda'),first=objects.find(o=>o.id==='first'),second=objects.find(o=>o.id==='second');
 const active=beat<3?first:second,firstDone=beat>=3||completed,secondDone=beat===5||completed&&beat>=3;
 const decorations=[];
 if(lesson.week===1){
  decorations.push(decor('tree-left','scene-tree',9,36,28,0));
  const animalStage=(animal,done,index)=>{
   if(animal.word==='bird'){animal.x=done?41:65;animal.y=done?34:22;animal.size=21;animal.z=6;return;}
   if(animal.word==='fish'){decorations.push(decor('pond','scene-pond',78,77,39,0));animal.x=done?66:84;animal.y=73;animal.size=19;animal.z=2;return;}
   animal.x=done?37+index*22:60+index*22;animal.y=done?70:65;animal.size=24;animal.z=done?6:2;
   decorations.push(decor('bush-'+index,'scene-shrub',60+index*22,78,31,4));
  };
  animalStage(first,firstDone,0);animalStage(second,secondDone,1);
  objects.filter(o=>o.id.startsWith('recall')||o.id.startsWith('review')).forEach((o,i)=>{o.x=12+i*13;o.y=o.word==='bird'?24:o.word==='fish'?81:81;o.size=14;o.z=1;});
  panda.x=18;panda.y=67;panda.pose=completed?'wave':'point';
 }
 if(lesson.week===2&&['red','blue','yellow','green'].includes(first.word)){
  const c1=firstDone?first.word:'blank',c2=secondDone?second.word:'blank';
  decorations.push(decor('paint-first','scene-paint-board-'+c1,53,60,32,2),decor('paint-second','scene-paint-board-'+c2,83,60,32,2));
  first.x=46;first.y=85;first.size=13;first.z=5;second.x=76;second.y=85;second.size=13;second.z=5;
  objects.filter(o=>o.id.startsWith('recall')).forEach((o,i)=>{delete o.color;o.x=12+i*18;o.y=33;o.size=13;o.z=0;});
  panda.pose=completed?'point':'wave';panda.x=18;
 }
 if(lesson.week===2&&!['red','blue','yellow','green'].includes(first.word))decorations.push(decor('play-rug','scene-picnic-mat',64,84,66,0));
 if(lesson.week===3){
  decorations.push(decor('picnic-cloth','scene-picnic-mat',61,82,68,0));
  const basket=objects.find(o=>o.id==='picnic-basket');basket.x=55;basket.y=76;basket.size=38;basket.z=2;
  const foodPlacement=(food,done,index)=>{food.x=done?50+index*10:73+index*16;food.y=done?65:53;food.size=done?16:22;food.z=done?3:5;};
  foodPlacement(first,firstDone,0);foodPlacement(second,secondDone,1);
  if(scene.objects.some(o=>o.id==='receiver')&&secondDone){second.x=77;second.y=65;second.z=7;}
  objects.filter(o=>o.id.startsWith('recall')).forEach((o,i)=>{o.x=10+i*20;o.y=29;o.size=14;o.z=0;});
 }
 if(lesson.week===4){
  decorations.push(decor('start-mark','scene-point-ring',24,88,20,0),decor('finish-mark','scene-point-ring',78,88,20,0));
  panda.pose=active.word;panda.x=completed?66:36;panda.y=active.word==='jump'&&completed?45:66;panda.size=32;
  first.hidden=true;second.hidden=true;
  if(active.word==='sit'){panda.y=73;panda.size=26;}if(active.word==='stand'){panda.y=63;panda.size=33;}
  objects.filter(o=>o.id.startsWith('recall')).forEach((o,i)=>{o.x=9+i*22;o.y=83;o.size=16;o.z=1;});
 }
 if(lesson.week===5){
  decorations.push(decor('mirror','scene-mirror',65,57,43,1));
  panda.x=20;panda.y=67;panda.size=30;panda.pose='point';
  objects.push(obj('reflection','mascot',65,61,29,2,{pose:'point'}));
  first.hidden=true;second.hidden=true;
  const body={head:[65,43],hand:[52,63],eye:[60,49],ear:[73,42],nose:[65,55],mouth:[65,59],arm:[77,63],leg:[70,78]};
  const [x,y]=body[active.word]||[65,56];
  decorations.push(decor('body-point','scene-point-ring',x,y,completed?10:8,8));
  objects.filter(o=>o.id.startsWith('recall')||o.id.startsWith('review')).forEach((o,i)=>{o.x=8+i*10;o.y=87;o.size=10;o.z=0;});
 }
 if(lesson.week===6){
  decorations.push(decor('wardrobe','scene-wardrobe',72,60,50,1));
  panda.x=22;panda.y=64;panda.size=34;
  const dressing=(garment,done,index)=>{
   const placement={hat:[22,40,22],shoes:[22,86,18],socks:[22,82,16],shirt:[22,66,22],pants:[22,77,20],dress:[22,69,24],coat:[22,64,25],skirt:[22,75,22]};
   if(done){const [x,y,size]=placement[garment.word]||[22,65,22];Object.assign(garment,{x,y,size,z:7});}
   else Object.assign(garment,{x:59+index*25,y:59+index*6,size:21,z:3});
  };
  dressing(first,firstDone,0);dressing(second,secondDone,1);
  objects.filter(o=>o.id.startsWith('recall')||o.id.startsWith('review')).forEach((o,i)=>{o.x=9+i*12;o.y=26;o.size=11;o.z=0;});
 }
 if(lesson.week===7){
  decorations.push(decor('album-back','scene-picnic-mat',66,70,66,0));
  first.x=firstDone?45:57;first.y=60;first.size=22;first.z=3;
  second.x=secondDone?72:85;second.y=60;second.size=22;second.z=3;
  decorations.push(decor('photo-first','scene-photo-frame',first.x,first.y,27,4),decor('photo-second','scene-photo-frame',second.x,second.y,27,4));
  panda.x=18;panda.y=67;panda.pose=completed?'wave':'point';
  objects.filter(o=>o.id.startsWith('recall')||o.id.startsWith('review')).forEach((o,i)=>{o.x=18+i*22;o.y=25;o.size=12;o.z=1;decorations.push(decor('small-photo-'+i,'scene-photo-frame',o.x,o.y,16,2));});
 }
 if(lesson.week===8){
  decorations.push(decor('room-rug','scene-picnic-mat',63,87,76,0));
  first.x=51;first.y=67;first.size=34;first.z=2;second.x=81;second.y=67;second.size=32;second.z=2;
  if(['bed','chair','sofa'].includes(active.word)&&(completed||beat===5)){
   active.x=61;active.y=74;active.size=44;
   panda.x=61;panda.y=55;panda.size=24;panda.z=4;panda.pose='sit';
   if(active.word==='bed')panda.rotate=-65;
   const teddy=objects.find(o=>o.word==='teddy');if(teddy){teddy.x=61;teddy.y=55;teddy.size=21;teddy.z=5;panda.x=22;panda.y=65;panda.size=29;panda.rotate=0;}
  }
  if(active.word==='door'){active.open=completed||beat===5;active.x=78;active.y=54;active.size=39;if(completed){panda.x=58;panda.pose='wave';}}
  if(active.word==='table'&&completed){const apple=objects.find(o=>o.word==='apple');if(apple){apple.x=51;apple.y=52;apple.size=14;apple.z=4;}panda.x=34;panda.pose='point';}
  if(active.word==='window'&&completed){const cat=objects.find(o=>o.word==='cat');if(cat){cat.x=51;cat.y=57;cat.size=21;cat.z=4;}panda.x=35;panda.pose='point';}
  if(active.word==='lamp'&&(completed||beat>=3))decorations.push(decor('reading-light','scene-point-ring',52,42,26,0));
  if(active.word==='book'&&completed){active.x=32;active.y=67;active.size=19;active.z=7;panda.x=24;panda.pose='sit';}
  objects.filter(o=>(o.id.startsWith('recall')||o.id.startsWith('review'))&&!(completed&&active.word==='table'&&o.word==='apple')&&!(completed&&active.word==='window'&&o.word==='cat')).forEach((o,i)=>{o.x=12+i*19;o.y=29;o.size=14;o.z=0;});
 }
 return {...scene,decorations};
}

function sceneReceiver(objects,word){
 const existing=objects.find(o=>o.word===word);
 if(existing){existing.id='receiver';existing.x=80;existing.y=61;existing.size=28;existing.z=5;}
 else objects.push(obj('receiver',word,80,61,28,5));
}

function hideAndSeekScene(lesson,beat,completed){
 const outside=beat===0||beat===5,hidden=!outside&&!completed,catOnLid=beat>=3&&beat<5&&!completed;
 const objects=[obj('box','box',43,71,39,2,{open:outside||completed}),
  obj('panda','mascot',beat===0?17:beat===5?20:43,outside?64:beat===2&&completed?55:66,27,3,{pose:beat===5?'wave':'peek',hidden}),
  obj('cat','cat',catOnLid?43:78,catOnLid?54:66,23,6),
  obj('ball','ball',beat===5?38:88,beat===5?65:78,13,7,{color:'red'})];
 const decorations=hidden?[decor('peek-tail','scene-panda-tail',27,73,24,6)]:[];
 return {setting:lesson.theme,objects,decorations};
}

function positionScene(lesson,beat,completed){
 if(lesson.id==='w9-d2')return hideAndSeekScene(lesson,beat,completed);
 const [a,b]=focusWords(lesson),selected=beat<3?a:b;
 if(lesson.id==='w9-d1'){
  return {setting:lesson.theme,objects:[obj('panda','mascot',20,64,27,5),obj('box','box',52,71,34,2,{open:beat>=3||completed}),obj('basket','basket',82,71,29,2,{open:true}),obj('ball','ball',beat>=3?52:38,beat>=3?57:81,13,3,{color:'red'}),obj('car','car',completed&&beat===4?81:88,completed&&beat===4?58:82,16,3),obj('cat','cat',beat<2?51:13,beat<2?45:33,18,6)]};
 }
 if(lesson.id==='w9-d3'){
  const under=beat<3;
  return {setting:lesson.theme,objects:[obj('panda','mascot',17,64,27,5),obj('table','table',45,57,39,4),obj('box','box',79,70,30,4,{open:false}),obj('ball','ball',completed?25:under?45:79,completed?61:under?78:51,15,completed?7:under?2:3,{color:'red'}),obj('cat','cat',under?78:43,34,18,1)]};
 }
 if(lesson.id==='w9-d4'){
  return {setting:lesson.theme,objects:[obj('panda','mascot',15,62,25,5),obj('box','box',49,69,25,2,{open:false}),obj('near-ball','ball',completed&&selected==='near'?28:65,completed&&selected==='near'?61:74,14,5,{color:'red'}),obj('far-ball','ball',completed&&selected==='far'?28:91,completed&&selected==='far'?61:32,14,5,{color:'blue'}),obj('rabbit','rabbit',83,72,22,4)]};
 }
 // The weekly route uses a real box interior followed by a ball under a table.
 return {setting:lesson.theme,objects:[obj('panda','mascot',17,62,26,5),obj('box','box',46,70,32,2,{open:beat>=3||completed}),obj('ball-in','ball',completed&&beat<3?26:46,completed&&beat<3?60:57,13,completed&&beat<3?7:3,{color:'red'}),obj('table','table',79,55,34,4),obj('ball-under','ball',completed&&beat>=3?26:79,completed&&beat>=3?60:77,13,completed&&beat>=3?7:2,{color:'red'}),obj('cat','cat',16,31,16,1)]};
}

function numberScene(lesson,beat,completed){
 const [a,b]=focusWords(lesson),selected=beat<3?a:b,count=numberValue[selected];
 const item=lesson.id==='w11-d1'?'apple':lesson.id==='w11-d2'?(beat<3?'ball':'car'):lesson.id==='w11-d3'?'egg':lesson.id==='w11-d4'?'blocks':(beat<3?'apple':'ball');
 const objects=[obj('panda','mascot',17,63,28,5),obj('basket','basket',completed?52:83,77,29,2,{open:true})];
 for(let i=0;i<count;i++)objects.push(obj('item-'+i,item,completed?45+(i%3)*9:43+(i%4)*15,completed?64-Math.floor(i/3)*10:48+Math.floor(i/4)*21,completed?12:14,3,{unit:item==='blocks'}));
 objects.push(obj('friend',lesson.id==='w11-d1'?'rabbit':'cat',85,32,18,1));
 return {setting:lesson.theme,objects};
}

function finalWeekScene(lesson,beat,completed){
 const [a,b]=focusWords(lesson),selected=beat<3?a:b;
 if(lesson.id==='w12-d3'){
  return {setting:lesson.theme,objects:[obj('panda','mascot',16,63,27,5),obj('big-box','box',49,69,40,2,{open:true}),obj('small-box','box',84,76,23,2,{open:true}),obj('teddy','teddy',completed&&beat<3?49:28,completed&&beat<3?52:30,24,3),obj('ball','ball',84,completed&&beat>=3?65:30,12,3,{color:'red'})]};
 }
 if(lesson.id==='w12-d4'){
  return {setting:lesson.theme,objects:[obj('panda','mascot',16,64,27,5),obj('rabbit','rabbit',82,35,21,1),obj('car','car',completed?76:42,72,27,4,{pose:selected==='fast'?'run':'walk',speed:selected==='fast'?'fast':'slow'}),obj('marker','ball',82,77,12,2,{color:'red'}),obj('speed',selected,58,28,18,2)]};
 }
 const thirsty=selected==='thirsty',hungry=selected==='hungry';
 const objects=[obj('panda','mascot',19,64,28,5),obj('friend',lesson.id==='w12-d2'||lesson.id==='w12-d5'&&beat<3?'bear':'cat',65,64,30,4),obj('feeling',completed?'happy':selected,66,28,18,6)];
 if(lesson.id==='w12-d1')objects.push(obj('ball','ball',selected==='sad'&&!completed?91:62,selected==='sad'&&!completed?82:73,14,5,{color:'red'}));
 else{
  objects.push(obj('food',lesson.id==='w12-d5'?'apple':'bread',completed&&hungry?59:37,completed&&hungry?68:33,17,6));
  objects.push(obj('drink','water',completed&&thirsty?68:87,completed&&thirsty?66:33,17,6));
 }
 if(completed){objects[0].x=38;objects[0].pose='wave';}
 return {setting:lesson.theme,objects};
}

function sceneFor(lesson,plan,beat,completed=false){
 if(lesson.week===9)return positionScene(lesson,beat,completed);
 if(lesson.week===11)return numberScene(lesson,beat,completed);
 if(lesson.week===12)return finalWeekScene(lesson,beat,completed);
 const scene=baseScene(lesson,plan,beat,completed);
 if(lesson.week===10){
  const weather=focusWords(lesson)[beat<3?0:1];
  scene.weather=weather;
  scene.objects=scene.objects.filter(o=>o.id!=='first'&&o.id!=='second');
  scene.objects.push(obj('weather',weather,72,28,32,1));
  if(completed){const panda=scene.objects.find(o=>o.id==='panda');panda.x=41;
   if(['rainy','windy','cold','snowy'].includes(weather))scene.objects.push(obj('weather-coat','coat',41,66,18,7));
   else scene.objects.push(obj('weather-hat','hat',41,38,19,7));
  }
 }
 return scene;
}

function makeTask(lesson,plan,beat,scene,wordMap,say){
 const taskIndex=beat===2?0:1,focus=focusWords(lesson),target=lesson.id==='w9-d2'?'in':focus[taskIndex],other=focus[1-taskIndex];
 const type=plan.types[taskIndex];
 let choices=[target,other].map((word,i)=>({id:word,word,label:wordMap.get(word).zh,objectId:i===0?(taskIndex===0?'first':'second'):(taskIndex===0?'second':'first')}));
 if(type==='count')choices=choices.map(choice=>({...choice,count:numberValue[choice.word],item:lesson.id==='w11-d1'?'apple':lesson.id==='w11-d2'?(taskIndex===0?'ball':'car'):lesson.id==='w11-d3'?'egg':lesson.id==='w11-d4'?'blocks':(taskIndex===0?'apple':'ball')}));
 if(lesson.id==='w9-d1')choices=choices.map(c=>({...c,objectId:c.word}));
 if(lesson.id==='w9-d2')choices=[{id:'in',word:'in',label:'盒子里面的小熊猫',objectId:beat===2?'box':'panda'},{id:'on',word:'on',label:'盒子上面的小猫',objectId:'cat'}];
 if(lesson.id==='w9-d3')choices=[{id:'under',word:'under',label:'桌子下面',objectId:'ball'},{id:'behind',word:'behind',label:'盒子后面',objectId:'box'}];
 if(lesson.id==='w9-d4')choices=[{id:'near',word:'near',label:'离盒子近的球',objectId:'near-ball'},{id:'far',word:'far',label:'离盒子远的球',objectId:'far-ball'}];
 if(lesson.id==='w9-d5')choices=[{id:'in',word:'in',label:'盒子里面',objectId:'box'},{id:'under',word:'under',label:'桌子下面',objectId:'ball-under'}];
 if(lesson.id==='w8-d2'&&beat===4)choices=choices.map(c=>({...c,objectId:c.word==='door'?'second':'first'}));
 if(lesson.id==='w12-d3')choices=[{id:'big',word:'big',label:'大的盒子',objectId:'big-box'},{id:'small',word:'small',label:'小的盒子',objectId:'small-box'}];
 const prompt=plan.n[beat];
 const successText=lesson.id==='w9-d2'?(beat===2?'箱盖打开啦，小熊猫在里面呢！':'你找到里面的小熊猫啦！'):type==='count'?'数量准备好啦，朋友可以来一起玩了。':type==='deliver'?'送到了，谢谢你把它带过来。':type==='color'?'颜色选好啦，画面变得更漂亮了。':type==='position'?'位置找对啦，小熊猫看见它了。':type==='reveal'?'找到啦，它出来和我们打招呼了。':'找到啦，我们可以接着往下玩。';
 const retry='再听一遍提示，慢慢找一找。';
 const english=lesson.id==='w9-d2'?'I’m in the box.':wordMap.get(target).phrase;
 const receiver=lesson.id==='w2-d3'?'receiver':(lesson.id==='w3-d2'||lesson.id==='w3-d5')&&beat===4?'receiver':lesson.week===3?'picnic-basket':'panda';
 return {type,prompt,promptAudio:say(prompt,'zh'),target,choices,...type==='deliver'?{receiver}:{},success:{text:successText,audio:say(successText,'zh'),english,englishAudio:say(english),scene:sceneFor(lesson,plan,beat,true)},retry:{text:retry,audio:say(retry,'zh')}};
}

const plainEnglish=text=>text.replace(/[’]/g,"'").match(/[a-z]+(?:'[a-z]+)?/gi)||[];

/** Upgrade already-authored lessons in place. No network or disk side effects. */
export function upgradeStories(lessons,vocabulary,say){
 const wordMap=new Map(vocabulary.map(word=>[word.id,word])),previous=new Set();
 for(const lesson of lessons){
  const original=clone(lesson.frames),plan=plans[lesson.id];
  if(!plan||original.length!==4)throw new Error('Missing original story plan: '+lesson.id);
  if(!lesson.words.every(word=>wordMap.has(word)))throw new Error('Unknown course words: '+lesson.id);
  plan.recall=plan.recall.filter(word=>previous.has(word)&&wordMap.has(word));
  const focus=focusWords(lesson),texts=[original[0].text,original[1].text,wordMap.get(focus[0]).phrase,original[2].text,wordMap.get(focus[1]).phrase,original[3].text];
  // The exact existing English sentences remain intact; familiar expressions
  // surround them on the same audio turn so recall is actually heard.
  for(const [i,word]of plan.recall.entries()){
   const beat=[0,1,3,5][i];
   if(!texts[beat].includes(wordMap.get(word).phrase))texts[beat]+=' '+wordMap.get(word).phrase;
  }
  if(lesson.id==='w9-d2')texts.splice(0,6,'Look! A box. Let’s play.','I’m in the box.','I’m in the box.','The cat is on the box.','In the box.','A red ball. Here you are.');
  if(lesson.id==='w9-d5')texts.splice(0,6,'Let’s find the ball.','The ball is in the box.','In the box.','The ball is under the table.','Under the table.','Here is the red ball.');
  if(lesson.week===11){
   const item=lesson.id==='w11-d1'?'apple':lesson.id==='w11-d2'?'ball':lesson.id==='w11-d3'?'egg':lesson.id==='w11-d4'?'blocks':'apple';
   const item2=lesson.id==='w11-d2'?'car':lesson.id==='w11-d3'?'egg':lesson.id==='w11-d4'?'blocks':lesson.id==='w11-d5'?'ball':'apple';
   const phrase=(number,noun)=>number[0].toUpperCase()+number.slice(1)+' '+noun+(number==='one'||noun==='blocks'?'':'s')+'.';
   texts.splice(0,6,'Let’s get ready. '+wordMap.get(plan.recall[0]||'apple').phrase,phrase(focus[0],item),phrase(focus[0],item),phrase(focus[1],item2),phrase(focus[1],item2),'Ready! Thank you.');
  }
  if(lesson.id==='w12-d1')texts.splice(0,6,'Look! A cat.','The cat is happy.','Happy!','The cat is sad.','Sad!','Here is the red ball. The cat is happy.');
  if(lesson.id==='w12-d2')texts.splice(0,6,'Hello, bear!','The bear is hungry.','Hungry!','The bear is thirsty.','Thirsty!','Bread and water. Thank you!');
  if(lesson.id==='w12-d3')texts.splice(0,6,'Look! A teddy and a ball.','The box is big.','A big box.','The box is small.','A small box.','The teddy is in the big box.');
  if(lesson.id==='w12-d5')texts.splice(0,6,'Hello, friends!','The bear is hungry.','I’m hungry.','The cat is happy.','I’m happy.','Thank you, friends!');
  lesson.contentRevision='2.0.0';
  lesson.legacyFrames=original;
  lesson.recallWords=[...plan.recall];
  lesson.storyBrief={text:plan.n[0],audio:say(plan.n[0],'zh')};
  const gameText=lesson.week===9?'刚才的位置线索还在。再听一听，帮小熊猫把东西找齐吧。':lesson.week===11?'朋友的用品还要准备。听清数量，再帮小熊猫选出来吧。':lesson.week===12?'继续照顾刚才的朋友。听听它需要什么，再选一选吧。':lesson.week===3?'野餐还没准备完。听听朋友的请求，把物品送给它吧。':lesson.week===2?'继续布置刚才的小世界。听清声音，再选物品或颜色吧。':'故事里的朋友还想请你帮忙。再听声音，把今天的小任务完成吧。';
  lesson.gameBrief={text:gameText,audio:say(gameText,'zh')};
  lesson.frames=ROLES.map((role,beat)=>{
   const retained=[0,1,-1,2,-1,3][beat];
   const word=retained>=0&&lesson.week<=10?original[retained].word:beat<3?focus[0]:focus[1];
   const scene=sceneFor(lesson,plan,beat);
   return {id:lesson.id+'-f'+(beat+1),role,word,text:texts[beat],audio:say(texts[beat]),caption:plan.n[beat],narration:plan.n[beat],narrationAudio:say(plan.n[beat],'zh'),...(retained>=0?{retainedText:original[retained].text}:{}),scene,...beat===2||beat===4?{interaction:makeTask(lesson,plan,beat,scene,wordMap,say)}:{}};
  });
  // Each spoken practice sentence occurred in this lesson's actual story.
  lesson.speaking=lesson.words.map(word=>{
   const match=lesson.frames.find(frame=>frame.word===word&&frame.text.includes(word))||lesson.frames.find(frame=>frame.text.toLowerCase().includes(word))||null;
   const text=match?.text||wordMap.get(word).phrase;
   return {word,text,audio:say(text)};
  });
  const core=new Set(vocabulary.map(word=>word.id));
  lesson.supportLanguage=[...new Set(lesson.frames.flatMap(frame=>plainEnglish(frame.text)).map(word=>word.toLowerCase()).filter(word=>!core.has(word)))].sort();
  lesson.contentAudit={change:lesson.week<=4?'保留基础，扩展六幕':lesson.week<=10?'保留有效内容，扩展与修正':'调整重复教学，加入新目标',retainedVocabulary:lesson.week<=10,retainedCoreLines:lesson.week<=4?original.map(frame=>frame.text):[],priorWordSources:plan.recall.map(word=>({word,lesson:lessons.find(other=>other.number<lesson.number&&other.newWords.includes(word))?.id})),story:plan.n.join(' → ')};
  if(lesson.frames.filter(frame=>frame.interaction).length!==2)throw new Error('Story must have exactly two tasks');
  for(const frame of lesson.frames)if(frame.interaction){const interaction=frame.interaction;if(!interaction.choices.some(choice=>choice.id===interaction.target))throw new Error('Target missing from choices: '+lesson.id);for(const choice of interaction.choices)if(!lesson.knownWords.includes(choice.word))throw new Error('Untaught story choice: '+lesson.id+' '+choice.word);}
  for(const word of lesson.newWords)previous.add(word);
 }
 return lessons;
}

export function storyChangeAudit(lessons){
 const rows=lessons.map(lesson=>`| ${lesson.id} | ${lesson.title} | ${lesson.contentAudit.change} | ${lesson.newWords.join(', ')||'本周复习'} | ${lesson.recallWords.join(', ')||'首次见面，无旧词'} | ${lesson.frames[2].interaction.type} / ${lesson.frames[4].interaction.type} |`);
 return '# 课程逐课修改清单\n\n保留前四周的主题、词汇、顺序、故事基础及四句核心英文台词；第5—10周继续沿用有效内容；第11—12周调整重复教学目标。全部60课在原基础上扩展为六幕，两次互动均在第3、5幕。\n\n| 课程 | 原课程基础 | 修改类型 | 新词或复习目标 | 故事回忆旧词 | 两次故事互动 |\n|---|---|---|---|---|---|\n'+rows.join('\n')+'\n\n## 审计方法\n\n- `legacyFrames` 保留改版前四幕；前20课四句英文原文逐字保留在新台词中。\n- `contentAudit.priorWordSources` 逐一登记故事旧词首次教学课程，故事选项只用此前或当课正式教过的词。\n- 第11周以数量配合旧物品；第12周以感受、需求、大小和速度配合旧场景，不再把 cat/car 等旧词当新课。\n- 核心句型有意重复，完整六幕情节不重复。每一课的六段情节保存在 `contentAudit.story`，便于逐课审阅。\n- 故事中语法和辅助表达登记在 `supportLanguage`，不直接作为听音答题目标。\n';
}

