bundle install --local --path vendor/bundle
bundle exec juicer install yui_compressor
bundle exec juicer install jslint
bundle exec juicer merge javascripts/skanalytics.js
