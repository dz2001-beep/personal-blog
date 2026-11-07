# 厨房栏目的图片目录

把菜品照片放到这个目录下,然后在 `src/data/kitchen.ts`(或后台)里引用 `/kitchen/文件名.jpg`。

## 命名约定

用英文/pinyin 小写短横线,和菜品 slug 保持一致:

```
hongshaorou.jpg      红烧肉
suanjiemiao.jpg      蒜苔炒肉
tudousi.jpg          醋溜土豆丝
laziji.jpg           辣子鸡
roujiamo.jpg         肉夹馍
hongshaopaigu.jpg    红烧排骨
```

同一个菜有多张图(过程图)时加序号:`hongshaorou-1.jpg`、`hongshaorou-2.jpg`。

## 建议规格

- 宽度 1200–1600px 足够(卡片显示宽度约 600px)
- JPG,单张控制在 500KB 以内
- 比例不限,页面按 4:3 裁切显示

## 两类图片

- **做过的**:自己拍的照片,可以放过程图、糊锅照(翻车图比成品图更有说服力)
- **想学的**:参考图。如果是网图,请确保是免费授权来源(Unsplash / Pexels / 自摄),
  并在数据里填 `source` 字段标注来源,避免版权风险。
  带图库水印的图(摄图网、昵图网等)请不要使用。
