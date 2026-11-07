/**
 * 厨房:做饭研究笔记
 *
 * 两条线:
 *   - cooked  做过的:自己做的菜,记尝试次数、翻车记录、改良过程
 *   - wish    想学的:看到想学的菜,记为什么想学;做成之后改成 cooked
 *
 * 图片规则(当前菜单里的菜**全部有真实照片**,不再使用插画):
 *   - 封面:src/assets/kitchen/<slug>.(jpg|jpeg|png|webp) —— 文件名 = slug,自动识别
 *   - 补充照片:<slug>-2.*、<slug>-3.* 会显示在详情页
 *   - 没有照片的菜不要写进 DISHES(菜单与图片保持一一对应)
 */

export type DishType = 'cooked' | 'wish';

export interface Ingredient {
  name: string;
  amount?: string;
}

export interface Step {
  /** 步骤内容 */
  text: string;
  /** 这一步大概需要几分钟(可选) */
  minutes?: number;
  /** 小提示 / 关键点 */
  tip?: string;
}

export interface Dish {
  slug: string;
  type: DishType;
  name: string;
  /** 一句话副标题,比如「第一次做就翻车的家常菜」 */
  tagline?: string;
  /** 外部封面图(一般不用填,目录里的同名照片优先) */
  cover?: string;
  /** 做过的:首次做的日期;想学的:记下这道菜的日期 */
  date: string;
  /** 尝试次数:第几次才成功 */
  attempts?: number;
  /** 总耗时(分钟,含腌制/炖煮) */
  duration?: number;
  /** 难度 1-5 */
  difficulty?: number;
  /** 我的评分 1-5 */
  rating?: number;
  tags: string[];
  ingredients?: Ingredient[];
  steps?: Step[];
  /** 翻车记录:越具体越好,这是全站最有人味的部分 */
  failures?: string[];
  /** 一句话结论:值不值得再做 */
  verdict?: string;
  /** 心得 */
  note?: string;
  /** 想学的:为什么想学这道 */
  reason?: string;
  /** 图片来源标注(使用网图时请注明) */
  source?: string;
}

/**
 * 自动识别 src/assets/kitchen/ 下的照片
 * 文件名 = slug 即该菜封面;`<slug>-2` 这类视为补充照片
 */
const photoModules = import.meta.glob('../assets/kitchen/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** 文件名(不含扩展名) → 图片 URL */
const photoByKey: Record<string, string> = {};
for (const [filePath, url] of Object.entries(photoModules)) {
  const key = (filePath.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
  if (key) photoByKey[key] = url;
}

/** 取某道菜的封面 */
export function coverOf(dish: Dish): string | undefined {
  return photoByKey[dish.slug] ?? dish.cover;
}

/** 这道菜是否有封面照片 */
export function hasCover(dish: Dish): boolean {
  return Boolean(coverOf(dish));
}

/** 取某道菜的补充照片(`<slug>-2`、`<slug>-3` …) */
export function extraPhotosOf(dish: Dish): string[] {
  const out: string[] = [];
  for (let i = 2; i <= 9; i++) {
    const url = photoByKey[`${dish.slug}-${i}`];
    if (url) out.push(url);
  }
  return out;
}

/** 新增一道菜 = 在下面数组里加一个对象,并把照片放进 src/assets/kitchen/<slug>.webp */
export const DISHES: Dish[] = [
  {
    slug: 'suantaichaorou',
    type: 'cooked',
    name: '蒜苔炒肉',
    tagline: '蒜苔要断生又脆,肉要嫩',
    date: '2026-10',
    attempts: 2,
    duration: 20,
    difficulty: 2,
    rating: 4,
    tags: ['家常', '快手', '下饭'],
    ingredients: [
      { name: '蒜苔', amount: '300g' },
      { name: '猪里脊', amount: '150g' },
      { name: '生抽', amount: '1 勺' },
      { name: '蚝油', amount: '1 勺' },
      { name: '淀粉', amount: '1 小勺' },
      { name: '蒜', amount: '2 瓣' },
    ],
    steps: [
      { text: '蒜苔掐掉老根切段;里脊切丝,用生抽和淀粉抓匀腌 10 分钟', minutes: 10, tip: '肉丝上浆才嫩,别省这一步' },
      { text: '热锅凉油下肉丝滑散,变色就盛出', minutes: 2 },
      { text: '底油爆香蒜末,下蒜苔大火翻炒到断生', minutes: 3, tip: '闻到蒜苔味、颜色变深就够,炒软就废了' },
      { text: '肉丝回锅,加蚝油和少许盐翻匀', minutes: 1 },
      { text: '出锅前淋几滴香油', minutes: 1 },
    ],
    note: '这是我自己做的。',
  },
  {
    slug: 'yuxiangrousi',
    type: 'cooked',
    name: '鱼香肉丝',
    tagline: '酸甜咸辣,一勺汁决定成败',
    date: '2026-08',
    attempts: 3,
    duration: 30,
    difficulty: 3,
    rating: 4,
    tags: ['川菜', '下饭', '家常'],
    ingredients: [
      { name: '猪里脊', amount: '200g' },
      { name: '木耳', amount: '5 朵' },
      { name: '胡萝卜', amount: '半根' },
      { name: '青椒', amount: '1 个' },
      { name: '泡椒/剁椒', amount: '1 勺' },
      { name: '生抽', amount: '2 勺' },
      { name: '香醋', amount: '1 勺' },
      { name: '白糖', amount: '1 勺' },
      { name: '淀粉', amount: '1 勺' },
    ],
    steps: [
      { text: '里脊切丝上浆(生抽+淀粉+少许水),木耳、胡萝卜、青椒切丝', minutes: 10 },
      { text: '调鱼香汁:生抽 1 勺 + 醋 1 勺 + 糖 1 勺 + 淀粉半勺 + 水 3 勺搅匀', minutes: 2, tip: '汁的比例决定成败,糖醋大致 1:1' },
      { text: '热油下肉丝滑散盛出', minutes: 2 },
      { text: '底油小火炒香泡椒、姜蒜末,出红油', minutes: 1 },
      { text: '下胡萝卜、木耳、青椒丝翻炒,再回肉丝', minutes: 3 },
      { text: '倒入鱼香汁,大火收到挂在肉丝上', minutes: 2, tip: '汁一开就关火,久煮会发黑' },
    ],
    note: '这是我自己做的。',
  },
  {
    slug: 'laziji',
    type: 'wish',
    name: '辣子鸡',
    tagline: '想把「干香」做出来',
    date: '2026-06',
    duration: 40,
    difficulty: 4,
    tags: ['川菜', '炸物', '下饭'],
    ingredients: [
      { name: '鸡腿肉', amount: '500g' },
      { name: '干辣椒', amount: '一大把' },
      { name: '花椒', amount: '1 小把' },
      { name: '姜蒜', amount: '各适量' },
      { name: '生抽/料酒', amount: '各 1 勺' },
      { name: '淀粉', amount: '1 勺' },
      { name: '白芝麻', amount: '少许' },
    ],
    steps: [
      { text: '鸡腿去骨切小丁,加生抽、料酒、淀粉腌 20 分钟', minutes: 20 },
      { text: '中温油炸第一遍,炸到定型变浅黄捞出', minutes: 6, tip: '第一遍只为熟,不求上色' },
      { text: '油温升高复炸 40 秒,炸到边缘发干', minutes: 2, tip: '复炸是「干香」的关键' },
      { text: '小火煸香干辣椒和花椒,别炒糊', minutes: 2 },
      { text: '倒入鸡丁翻炒,加盐和芝麻,炒匀出锅', minutes: 2 },
    ],
  },
  {
    slug: 'huiguorou',
    type: 'wish',
    name: '回锅肉',
    tagline: '灯盏窝、肉片卷起来才算到位',
    date: '2026-09',
    duration: 35,
    difficulty: 3,
    tags: ['川菜', '家常', '下饭'],
    ingredients: [
      { name: '带皮五花肉', amount: '300g' },
      { name: '蒜苗', amount: '3 根' },
      { name: '郫县豆瓣酱', amount: '1 勺' },
      { name: '豆豉', amount: '1 小勺' },
      { name: '姜片/花椒', amount: '少许' },
      { name: '生抽/白糖', amount: '各少许' },
    ],
    steps: [
      { text: '整块五花冷水下锅,加姜片花椒煮 20 分钟,筷子能扎透即可', minutes: 20 },
      { text: '捞出稍放凉,切成 2mm 薄片', minutes: 5, tip: '凉一点才好切薄' },
      { text: '锅里不放油,小火煸肉片到卷曲出油(灯盏窝)', minutes: 5, tip: '这一步决定香不香,要有耐心' },
      { text: '把肉拨到一边,下豆瓣酱和豆豉炒出红油', minutes: 2 },
      { text: '加蒜苗段、生抽和一点糖,大火炒到断生出锅', minutes: 2 },
    ],
  },
  {
    slug: 'xiaochaorou',
    type: 'wish',
    name: '小炒肉',
    tagline: '辣椒要炒出虎皮,肉要带点焦边',
    date: '2025-12',
    duration: 20,
    difficulty: 2,
    tags: ['湘菜', '家常', '下饭'],
    ingredients: [
      { name: '五花肉/前腿肉', amount: '200g' },
      { name: '青红椒', amount: '各 2 个' },
      { name: '蒜片', amount: '3 瓣' },
      { name: '豆豉', amount: '1 小勺' },
      { name: '生抽/蚝油', amount: '各 1 勺' },
    ],
    steps: [
      { text: '肉切薄片(不腌,或只加一点生抽)', minutes: 5 },
      { text: '空锅下肉片煸到出油、边缘微焦', minutes: 4, tip: '先煸出油,后面才不会腻' },
      { text: '下蒜片和豆豉炒香', minutes: 1 },
      { text: '倒入辣椒,大火炒到表皮起虎皮', minutes: 3 },
      { text: '加生抽蚝油快速翻匀出锅', minutes: 1 },
    ],
  },
  {
    slug: 'guobaorou',
    type: 'wish',
    name: '锅包肉',
    tagline: '外壳要脆,酸甜要透',
    date: '2026-05',
    duration: 40,
    difficulty: 5,
    tags: ['东北菜', '炸物', '酸甜'],
    ingredients: [
      { name: '猪里脊', amount: '300g' },
      { name: '土豆淀粉', amount: '100g' },
      { name: '白糖', amount: '3 勺' },
      { name: '白醋', amount: '3 勺' },
      { name: '胡萝卜丝/葱姜丝', amount: '各少许' },
    ],
    steps: [
      { text: '里脊切大片拍松,加盐和料酒腌 10 分钟', minutes: 10 },
      { text: '土豆淀粉加水调成能挂住的糊,把肉片裹匀', minutes: 5, tip: '糊太稀挂不住,太厚壳会硬' },
      { text: '170℃ 初炸到定型浅黄捞出', minutes: 4 },
      { text: '190℃ 复炸 30 秒,外壳变脆', minutes: 2, tip: '复炸完要马上浇汁,不然会回软' },
      { text: '另起锅熬糖醋汁(糖醋 1:1)到冒大泡', minutes: 2 },
      { text: '下肉片和配丝,快速翻匀立刻出锅', minutes: 1 },
    ],
  },
  {
    slug: 'hongshaorou',
    type: 'wish',
    name: '红烧肉',
    tagline: '目标:皮糯、汁浓、不腻',
    date: '2026-03',
    duration: 90,
    difficulty: 4,
    tags: ['家常', '硬菜', '炖菜'],
    ingredients: [
      { name: '五花肉', amount: '500g' },
      { name: '冰糖', amount: '30g' },
      { name: '生抽/老抽', amount: '2 勺 / 半勺' },
      { name: '料酒', amount: '2 勺' },
      { name: '姜片/葱段', amount: '适量' },
      { name: '八角', amount: '1 颗' },
    ],
    steps: [
      { text: '五花切 3cm 方块,冷水下锅焯水去浮沫', minutes: 10 },
      { text: '小火炒冰糖到枣红色、冒小泡', minutes: 3, tip: '糖色一苦就废了,宁可浅一点' },
      { text: '下肉块快速翻裹上色', minutes: 2 },
      { text: '加料酒、生抽、老抽、姜葱八角,倒热水没过肉', minutes: 3 },
      { text: '小火炖 60 分钟,中途别频繁翻动', minutes: 60, tip: '水要一次加够' },
      { text: '大火收汁到浓稠发亮', minutes: 8 },
    ],
  },
  {
    slug: 'hongshaopaigu',
    type: 'wish',
    name: '红烧排骨',
    tagline: '和红烧肉同一套糖色,换了个部位',
    date: '2026-11',
    duration: 60,
    difficulty: 3,
    tags: ['家常', '硬菜', '炖菜'],
    ingredients: [
      { name: '排骨', amount: '500g' },
      { name: '冰糖', amount: '20g' },
      { name: '生抽/老抽', amount: '2 勺 / 半勺' },
      { name: '料酒', amount: '2 勺' },
      { name: '姜葱/八角/干辣椒', amount: '适量' },
    ],
    steps: [
      { text: '排骨冷水下锅焯水,撇净浮沫捞出', minutes: 8 },
      { text: '炒糖色到枣红,下排骨翻裹上色', minutes: 4 },
      { text: '加料酒、生抽、老抽、姜葱、八角、干辣椒炒香', minutes: 3 },
      { text: '倒热水没过,小火炖 35 分钟', minutes: 35 },
      { text: '大火收汁,撒葱花', minutes: 6 },
    ],
  },
  {
    slug: 'suantaichaomo',
    type: 'wish',
    name: '肉末蒜苔',
    tagline: '蒜苔切小丁,炒到断生就出锅',
    date: '2026-07',
    duration: 15,
    difficulty: 1,
    tags: ['家常', '快手', '下饭'],
    ingredients: [
      { name: '蒜苔', amount: '300g' },
      { name: '猪肉末', amount: '150g' },
      { name: '小米辣', amount: '2 个' },
      { name: '蒜末', amount: '3 瓣' },
      { name: '生抽/老抽', amount: '1 勺 / 少许' },
    ],
    steps: [
      { text: '蒜苔切成 0.5cm 小丁,小米辣切圈', minutes: 5 },
      { text: '热油把肉末炒散,炒到微微焦香', minutes: 3, tip: '肉末要炒干一点才香' },
      { text: '下蒜末和小米辣炒香', minutes: 1 },
      { text: '倒入蒜苔大火快炒到断生', minutes: 3 },
      { text: '加生抽、一点老抽上色,翻匀出锅', minutes: 1 },
    ],
  },
  {
    slug: 'mapodoufu',
    type: 'wish',
    name: '麻婆豆腐',
    tagline: '麻、辣、烫、嫩、香,一个都不能少',
    date: '2026-04',
    duration: 25,
    difficulty: 3,
    tags: ['川菜', '下饭', '家常'],
    ingredients: [
      { name: '嫩豆腐', amount: '1 盒' },
      { name: '牛肉末', amount: '100g' },
      { name: '郫县豆瓣酱', amount: '1 勺' },
      { name: '豆豉', amount: '1 小勺' },
      { name: '花椒粉', amount: '适量' },
      { name: '蒜末/青蒜', amount: '适量' },
      { name: '水淀粉', amount: '3 勺' },
    ],
    steps: [
      { text: '豆腐切块,放淡盐水里小火焯 1 分钟捞出', minutes: 3, tip: '焯盐水豆腐不易碎' },
      { text: '炒散牛肉末到酥香', minutes: 3 },
      { text: '下豆瓣酱、豆豉、蒜末炒出红油', minutes: 2 },
      { text: '加水烧开,下豆腐小火煮 3 分钟(别翻,晃锅)', minutes: 4 },
      { text: '分三次勾芡,每次都晃匀', minutes: 3, tip: '三次勾芡汤汁才挂得住' },
      { text: '出锅撒花椒粉和青蒜末', minutes: 1 },
    ],
  },
  {
    slug: 'pidandoufu',
    type: 'wish',
    name: '皮蛋豆腐',
    tagline: '凉菜里的省事王,拌一拌就上桌',
    date: '2026-10',
    duration: 10,
    difficulty: 1,
    tags: ['凉菜', '快手', '下酒'],
    ingredients: [
      { name: '内酯豆腐', amount: '1 盒' },
      { name: '皮蛋', amount: '2 个' },
      { name: '生抽', amount: '2 勺' },
      { name: '香醋', amount: '1 勺' },
      { name: '香油/蒜末/小葱', amount: '适量' },
    ],
    steps: [
      { text: '豆腐倒扣脱模,切块摆盘', minutes: 3 },
      { text: '皮蛋切小丁,铺在豆腐上', minutes: 2 },
      { text: '调汁:生抽 + 香醋 + 香油 + 蒜末', minutes: 2 },
      { text: '淋上汁,撒葱花即可', minutes: 1 },
    ],
  },
  {
    slug: 'liangbandoufusi',
    type: 'wish',
    name: '凉拌豆腐丝',
    tagline: '切得越细越好入味',
    date: '2026-02',
    duration: 15,
    difficulty: 1,
    tags: ['凉菜', '快手', '素菜'],
    ingredients: [
      { name: '干豆腐(千张)', amount: '2 张' },
      { name: '胡萝卜', amount: '半根' },
      { name: '香菜', amount: '1 小把' },
      { name: '蒜末', amount: '3 瓣' },
      { name: '生抽/香醋/辣椒油', amount: '各 1 勺' },
    ],
    steps: [
      { text: '干豆腐切细丝,胡萝卜切丝', minutes: 6, tip: '越细越入味,别偷懒' },
      { text: '水开下豆腐丝焯 30 秒,捞出过凉水沥干', minutes: 3 },
      { text: '调汁:生抽 + 香醋 + 辣椒油 + 蒜末 + 少许盐', minutes: 2 },
      { text: '所有材料拌匀,撒香菜', minutes: 2 },
    ],
  },
  {
    slug: 'youmendaxia',
    type: 'wish',
    name: '油焖大虾',
    tagline: '虾要煎出虾油,汤汁收到挂在身上',
    date: '2026-01',
    duration: 25,
    difficulty: 3,
    tags: ['海鲜', '硬菜', '家常'],
    ingredients: [
      { name: '大虾', amount: '500g' },
      { name: '姜蒜', amount: '各适量' },
      { name: '番茄酱', amount: '1 勺' },
      { name: '糖', amount: '1 小勺' },
      { name: '生抽/料酒', amount: '各 1 勺' },
      { name: '葱花', amount: '少许' },
    ],
    steps: [
      { text: '虾剪须、开背去虾线,擦干水分', minutes: 8, tip: '一定要擦干,带水下锅会溅油' },
      { text: '热油下虾,两面煎到变红并压出虾油', minutes: 4, tip: '压虾头出红油,这是香味的来源' },
      { text: '下姜蒜末炒香', minutes: 1 },
      { text: '加番茄酱、糖、生抽、料酒和少量水', minutes: 2 },
      { text: '中火焖 3 分钟,大火收汁裹匀,撒葱花', minutes: 5 },
    ],
  },
];
