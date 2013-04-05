bundle install --local --path vendor/bundle
bundle exec sprockets --js-compressor=uglifier -Ijavascripts javascripts/songkick-analytics.js -o build/
