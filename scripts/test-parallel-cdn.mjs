async function test() {
  const url = 'https://hk-wms-oms-cdn.yunwms.com/ecoms/label/ntc0sh7/pdf/2026/10/21/20261021111037_OOX2L.pdf';
  console.time('fetch20Parallel');
  await Promise.all(new Array(20).fill(url).map(async u => {
    const res = await fetch(u);
    return await res.arrayBuffer();
  }));
  console.timeEnd('fetch20Parallel');
}
test();
