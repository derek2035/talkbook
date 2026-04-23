import { ApiError } from './api-error.js';

const highRiskPatterns = [
  /未成年.{0,6}(性|开房|成人视频|裸体|成人视频)/,
  /(儿童|幼女|幼童).{0,6}(性|色情|裸聊|开房)/,
  /(炸弹|爆炸物).{0,10}(制作|教程|配方|购买)/,
  /(枪支|手枪|步枪).{0,10}(购买|出售|改装|教程)/,
  /(冰毒|海洛因|可卡因).{0,10}(购买|贩卖|配方|制作)/,
  /(恐怖袭击|制造恐怖|发动袭击)/,
  /(杀人|分尸).{0,10}(教程|方法|技巧|不被发现)/,
  /(仇恨|清洗|灭绝).{0,6}(某族|某民族|某宗教|群体)/
];

function normalize(value: string) {
  return value.replace(/\s+/g, '');
}

export function assertSafeUserContent(value: string) {
  const normalized = normalize(value);

  if (!normalized) {
    return;
  }

  const matched = highRiskPatterns.some((pattern) => pattern.test(normalized));

  if (matched) {
    throw new ApiError(422, '内容包含暂不支持处理的高风险信息，请调整后重试。');
  }
}
