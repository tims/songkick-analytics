bundle install --local --path vendor/bundle
echo "Running sprockets"
bundle exec sprockets -Ijavascripts javascripts/songkick-analytics.js > build/songkick-analytics.js
bundle exec sprockets --js-compressor=uglifier -Ijavascripts javascripts/songkick-analytics.js > build/songkick-analytics.min.js
