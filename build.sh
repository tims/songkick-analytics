bundle install --local --path vendor/bundle
echo "Running sprockets"
mkdir -pv target
cat javascripts/banner.js > target/songkick-analytics.js
bundle exec sprockets -Ijavascripts javascripts/songkick-analytics.js >> target/songkick-analytics.js