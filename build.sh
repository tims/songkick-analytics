bundle install --local --path vendor/bundle
echo "Running sprockets"
bundle exec sprockets --js-compressor=uglifier -Ijavascripts javascripts/songkick-analytics.js -o build/
