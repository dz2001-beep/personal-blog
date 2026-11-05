/**
 * 相册数据:src 指向 public/gallery/ 下的图片,title 为图片标题
 * 图片来自 Unsplash 免费授权(https://unsplash.com/license)
 */
export interface GalleryItem {
  src: string;
  title: string;
}

export const GALLERY: GalleryItem[] = [
  { src: '/gallery/mountain-river.jpg', title: '山河远阔' },
  { src: '/gallery/foggy-peaks.jpg', title: '云雾山峦' },
  { src: '/gallery/forest.jpg', title: '森林之光' },
  { src: '/gallery/snow-mountain.jpg', title: '雪岭之巅' },
  { src: '/gallery/starry-night.jpg', title: '星空下的山' },
  { src: '/gallery/beach.jpg', title: '海天一色' },
  { src: '/gallery/sunset-field.jpg', title: '日落原野' },
  { src: '/gallery/waterfall.jpg', title: '飞瀑流泉' },
];
