const [major, minor] = process.versions.node.split('.').map(Number);
try {
  if (major < 22 || (major === 22 && minor < 13)) throw new Error('version');
  await import('node:sqlite');
} catch {
  console.error(`无法启动研究服务：当前 Node ${process.versions.node}，需要 Node >=22.13.0 且支持 node:sqlite。请切换 Node 版本后重新运行 npm 命令。`);
  process.exit(1);
}
