import { execSync } from 'node:child_process';

const cwd = '/Users/derek/code/talkbook';

const checks = [
  ['类型检查', 'pnpm typecheck'],
  ['服务端构建', 'pnpm build:server'],
  ['主链路冒烟', 'pnpm test:smoke']
];

for (const [label, command] of checks) {
  console.log(`\n==> ${label}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

console.log('\n==> 结果');
console.log(
  JSON.stringify(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      checks: checks.map(([label]) => label),
      note: '代码层面的上线前自检已通过；真实微信、ASR、LLM、支付、正式域名与平台审核仍需外部条件。'
    },
    null,
    2
  )
);
