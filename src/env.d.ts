/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** 当前登录的管理员用户名(中间件注入) */
    username?: string;
  }
}
