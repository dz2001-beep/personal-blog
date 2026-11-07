/**
 * 厨房:做饭研究笔记
 *
 * 两条线:
 *   - cooked  做过的:自己做的菜,记尝试次数、翻车记录、改良过程
 *   - wish    想学的:看到想学的菜,记为什么想学;做成之后改成 cooked
 *
 * 新增一道菜 = 在这里加一个对象,照片放进 src/assets/kitchen/(文件名 = slug,自动识别)
 * 图片建议:宽度 1200–1600px,JPG,<500KB;没有照片时卡片自动用文字版式,不会出现破图
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
  /** 封面图:/kitchen/xxx.jpg;留空则使用文字版式卡片 */
  cover?: string;
  /** 过程图(可选) */
  photos?: string[];
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
  /** 心得(Markdown 简易支持:换行分段) */
  note?: string;
  /** 想学的:为什么想学这道 */
  reason?: string;
  /** 想学的:图片来源标注(使用网图时请注明,带图库水印的图不要用) */
  source?: string;
}

/**
 * 自动识别 src/assets/kitchen/ 下的照片
 * 文件名 = slug 即可自动成为该菜的封面,不需要改代码。
 * 优先级:目录里的图片 > 数据里的 cover 字段 > 文字版式卡片
 */
const coverModules = import.meta.glob('../assets/kitchen/*.{jpg,jpeg,png,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** slug → { url, vector } —— 记录是否矢量插画,便于让真照片优先 */
const coverMap: Record<string, { url: string; vector: boolean }> = {};

for (const [filePath, url] of Object.entries(coverModules)) {
  const file = filePath.split('/').pop() ?? '';
  const slug = file.replace(/\.[^.]+$/, '');
  if (!slug) continue;

  const vector = /\.svg$/i.test(file);
  const current = coverMap[slug];

  // 真照片(jpg/png/webp)永远优先于矢量插画;同类以先出现者为准
  if (!current || (current.vector && !vector)) {
    coverMap[slug] = { url, vector };
  }
}

/** 取某道菜的封面:assets 目录(照片优先) > 数据里写的 cover */
export function coverOf(dish: Dish): string | undefined {
  return coverMap[dish.slug]?.url ?? dish.cover;
}

/** 这道菜是否有可用的照片/插画 */
export function hasCover(dish: Dish): boolean {
  return Boolean(coverOf(dish));
}

export const DISHES: Dish[] = [
  {
    slug: 'hongshaorou',
    type: 'wish',
    name: '红烧肉',
    tagline: '目标:皮糯、汁浓、不腻',
    date: '2026-10',
    difficulty: 4,
    tags: ['家常', '硬菜', '炖菜'],
    reason:
      '在外面吃过最难忘的一次是肥肉入口就化、瘦肉不塞牙。我自己做总是要么糖色发苦、要么炖得太干,所以想专门研究一次「炒糖色」的火候。',
    verdict: '还没做,先记着',
    note: '已知难点:炒糖色(冰糖化到什么颜色下肉)、炖煮时间(40 分钟还是 90 分钟)、收汁的时机。',
  },
  {
    slug: 'laziji',
    type: 'wish',
    name: '辣子鸡',
    tagline: '想把「干香」做出来',
    date: '2026-10',
    difficulty: 4,
    tags: ['川菜', '下饭', '炸物'],
    reason:
      '好吃的辣子鸡是鸡肉外干内嫩、辣椒香而不燥。我炸过一次,鸡块出水严重,最后变成了「焖鸡块加辣椒」。',
    verdict: '还想再试一次',
    note: '猜测关键:鸡块要提前腌+擦干水分,下锅油温要够高,分两次炸。',
  },
  {
    slug: 'xihongshichaodan',
    type: 'wish',
    name: '西红柿炒蛋',
    tagline: '看着最简单,其实最容易做成汤',
    date: '2026-11',
    tags: ['家常', '快手', '鸡蛋'],
    reason: '',
    verdict: '',
  },
  {
    slug: 'tudousi',
    type: 'wish',
    name: '醋溜土豆丝',
    tagline: '要脆、要酸香,不要软塌塌',
    date: '2026-11',
    tags: ['家常', '快手', '素菜'],
    reason: '',
    verdict: '',
  },
  {
    slug: 'xiaosurou',
    type: 'wish',
    name: '炸小酥肉',
    tagline: '外脆里嫩,凉了也不回软',
    date: '2026-11',
    tags: ['炸物', '川菜', '硬菜'],
    reason: '',
    verdict: '',
  },
  {
    slug: 'suantaichaorou',
    type: 'cooked',
    name: '蒜苔炒肉',
    tagline: '蒜苔要断生又脆,肉要嫩',
    date: '2026-11',
    tags: ['家常', '快手', '下饭'],
    note: '这是我自己做的。',
  },
  {
    slug: 'yuxiangrousi',
    type: 'cooked',
    name: '鱼香肉丝',
    tagline: '酸甜咸辣,一勺汁决定成败',
    date: '2026-11',
    tags: ['川菜', '下饭', '家常'],
    note: '这是我自己做的。',
  },
  {
    slug: 'koushuiqiezi',
    type: 'wish',
    name: '口水茄子',
    tagline: '茄子吸油是个坑',
    date: '2026-11',
    tags: ['川菜', '茄子', '下饭'],
    reason: '',
    verdict: '',
  },
  {
    slug: 'hongshaopaigu',
    type: 'wish',
    name: '红烧排骨',
    tagline: '和红烧肉同一套糖色,换了个部位',
    date: '2026-11',
    tags: ['家常', '硬菜', '炖菜'],
    reason: '',
    verdict: '',
  },
  {
    slug: 'roujiamo',
    type: 'wish',
    name: '肉夹馍',
    tagline: '馍要酥、肉要烂,自己做太难',
    date: '2026-11',
    tags: ['面食', '小吃'],
    reason: '',
    verdict: '',
  },
  {
    slug: 'paigudundoujiao',
    type: 'wish',
    name: '排骨炖豆角',
    tagline: '排骨要烂、豆角要吸满汤汁',
    date: '2026-11',
    tags: ['家常', '炖菜', '硬菜'],
    reason: '',
    verdict: '',
  },
  {
    slug: 'congyoubanmian',
    type: 'cooked',
    name: '葱油拌面',
    tagline: '第 2 次才成功,油温是关键',
    date: '2026-09',
    attempts: 2,
    duration: 25,
    difficulty: 2,
    rating: 4,
    tags: ['快手', '面食', '家常'],
    ingredients: [
      { name: '小葱', amount: '一把(葱白葱绿分开)' },
      { name: '挂面', amount: '150g' },
      { name: '生抽', amount: '2 勺' },
      { name: '老抽', amount: '半勺' },
      { name: '糖', amount: '1 小勺' },
      { name: '食用油', amount: '4 勺' },
    ],
    steps: [
      { text: '葱白切段、葱绿切长段,分开备用', minutes: 3, tip: '葱要擦干,带水下锅会爆油' },
      { text: '冷油下葱白,全程中小火慢炸到金黄', minutes: 8, tip: '关键:火小、时间长,急不得' },
      { text: '再下葱绿,炸到颜色发暗、香味出来就关火', minutes: 3 },
      { text: '把炸好的葱油浇进调好的酱汁(生抽+老抽+糖)', minutes: 1 },
      { text: '面条煮熟捞出,趁热拌入葱油酱汁', minutes: 5, tip: '面要控干水,不然酱汁会稀' },
    ],
    failures: [
      '第 1 次:油烧到冒烟才下葱,葱直接焦了,整锅发苦,只能倒掉。',
      '第 1 次:面条没控水,拌完变成汤面。',
    ],
    verdict: '会再做,成本低、成功率高,适合当工作日的晚饭',
    note: '两次之后总结:**油温低一点、时间长一点**,比高温猛炸香得多。',
  },
];
