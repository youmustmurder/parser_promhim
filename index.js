const puppeteer = require('puppeteer')
      cheerio = require('cheerio'),
      XlsxPopulate = require('xlsx-populate');

const options = {
  setViewport: { width: 1240, height: 680 },
  hostname: 'http://generalcompany.su/',
  selectrors: {
    product_link: '.hlisting .prod_title a.show_product',
    files: '.short_description a',
    product_name: '.product .product_mid_block .prod_title',
    main_pic: '#flink',
    description: '.product_dop_modes_content[itemprop="description"]'
  }
};

const pages_category = [
  'http://generalcompany.su/katalog/loctite-henkel/fiksatoryi-rezbyi'
];

const products_links = [],
      products = [];
let name_fils = 1;

const getLinksProducts = async (page) => {
  for (let item of pages_category) {
    await page.goto(item);
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
      if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg') || interceptedRequest.url().endsWith('.js') || interceptedRequest.url().endsWith('.css'))
        interceptedRequest.abort();
      else
        interceptedRequest.continue();
    });
    await page.waitFor(1000);
    let content = await page.content(),
        $ = cheerio.load(content);

    $(options.selectrors.product_link).each((i, elem) => {
      products_links.push($(elem).attr('href'));
    });
    await getProducsInfo(page, options);
    ProducsToXlsx();
    product_links = [];
  }
}

const getProducsInfo = async (page) => {
  for (let product_link of products_links) {
    await page.goto(product_link);
    await page.waitFor(1000);
    let content = await page.content(),
        $ = cheerio.load(content);

    let files = [];
    $(options.selectrors.files).each((i, elem) => {
      files.push(options.hostname + $(elem).attr('href'));
    });

    products.push([
      $(options.selectrors.product_name).text(),
      $(options.selectrors.main_pic).attr('href'),
      $(options.selectrors.description).html(),
      JSON.stringify(files),
    ]);
  }
}

function ProducsToXlsx() {
  XlsxPopulate.fromBlankAsync()
              .then(workbook => {
                workbook.sheet("Sheet1").cell("A1").value(products);
                return workbook.toFileAsync(`./out${name_fils++}.xlsx`);
              });
}

exports.defaults = (async () => {
  const browser = await puppeteer.launch({headless: false}),
        page = await browser.newPage();
  await page.setViewport(options.setViewport);
  await getLinksProducts(page);
  await browser.close();
  console.log('Successfull');
  process.exit(-1);
})();
