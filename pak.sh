while read F; do cat $F; done < dependencies.txt > songkick-analytics.js
java -jar yuicompressor-2.4.7.jar songkick-analytics.js > songkick-analytics.min.js
