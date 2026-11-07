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
    slug: 'laziji',
    type: 'wish',
    name: '辣子鸡',
    tagline: '想把「干香」做出来',
    date: '2026-11',
    tags: ['川菜', '炸物', '下饭'],
  },
  {
    slug: 'huiguorou',
    type: 'wish',
    name: '回锅肉',
    tagline: '灯盏窝、肉片卷起来才算到位',
    date: '2026-11',
    tags: ['川菜', '家常', '下饭'],
  },
  {
    slug: 'xiaochaorou',
    type: 'wish',
    name: '小炒肉',
    tagline: '辣椒要炒出虎皮,肉要带点焦边',
    date: '2026-11',
    tags: ['湘菜', '家常', '下饭'],
  },
  {
    slug: 'guobaorou',
    type: 'wish',
    name: '锅包肉',
    tagline: '外壳要脆,酸甜要透',
    date: '2026-11',
    tags: ['东北菜', '炸物', '酸甜'],
  },
  {
    slug: 'hongshaorou',
    type: 'wish',
    name: '红烧肉',
    tagline: '目标:皮糯、汁浓、不腻',
    date: '2026-11',
    tags: ['家常', '硬菜', '炖菜'],
  },
  {
    slug: 'hongshaopaigu',
    type: 'wish',
    name: '红烧排骨',
    tagline: '和红烧肉同一套糖色,换了个部位',
    date: '2026-11',
    tags: ['家常', '硬菜', '炖菜'],
  },
  {
    slug: 'suantaichaomo',
    type: 'wish',
    name: '肉末蒜苔',
    tagline: '蒜苔切小丁,炒到断生就出锅',
    date: '2026-11',
    tags: ['家常', '快手', '下饭'],
  },
  {
    slug: 'mapodoufu',
    type: 'wish',
    name: '麻婆豆腐',
    tagline: '麻、辣、烫、嫩、香,一个都不能少',
    date: '2026-11',
    tags: ['川菜', '下饭', '家常'],
  },
  {
    slug: 'pidandoufu',
    type: 'wish',
    name: '皮蛋豆腐',
    tagline: '凉菜里的省事王,拌一拌就上桌',
    date: '2026-11',
    tags: ['凉菜', '快手', '下酒'],
  },
  {
    slug: 'liangbandoufusi',
    type: 'wish',
    name: '凉拌豆腐丝',
    tagline: '切得越细越好入味',
    date: '2026-11',
    tags: ['凉菜', '快手', '素菜'],
  },
  {
    slug: 'youmendaxia',
    type: 'wish',
    name: '油焖大虾',
    tagline: '虾要煎出虾油,汤汁收到挂在身上',
    date: '2026-11',
    tags: ['海鲜', '硬菜', '家常'],
  },
];
