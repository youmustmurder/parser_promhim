const puppeteer = require('puppeteer')
      cheerio = require('cheerio'),
      XlsxPopulate = require('xlsx-populate');

const options = {
  setViewport: { width: 1240, height: 680 },
  hostname: 'http://generalcompany.su/',
  selectrors: {
    product_link: '.product-item__link a',
    files: '.document-item__title',
    product_name: '.product__name',
    sku: '.product__serial',
    main_pic: '.fancy-img',
    description: '.product__desc',
    table_options: '.tech_docs_table tr'
  }
};

const pages_category = [
  'https://varybond.net/products/category/1794530'
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
      files.push($(elem).attr('href'));
    });

    let options_array = [];
    $(options.selectrors.table_options).each((i, elem) => {
      let option = {
        key: $(elem).find('td:first-child span').text(),
        value: $(elem).find('td:last-child span').text()
      }
      options_array.push(option);
    });

    products.push([
      $(options.selectrors.product_name).text().trim(),
      $(options.selectrors.sku).text().trim().substr(9),
      $(options.selectrors.main_pic).attr('href'),
      $(options.selectrors.description).html(),
      JSON.stringify(files),
      JSON.stringify(options_array)
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
