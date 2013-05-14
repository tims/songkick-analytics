# -*- coding: UTF-8 -*-
require 'aws/s3'
require 'erb'

version = "0.1.6"

task :default => [:compile, :minify]

task :compile do
  js = "songkick-analytics.#{version}"
  puts "compiling #{js}"
  system("bundle exec sprockets -Isrc src/songkick-analytics.js > target/#{js}.js")
end

task :minify do
  compressor = "java -jar vendor/plugins/yuicompressor/yuicompressor-2.4.7.jar"
  js = "songkick-analytics.#{version}"
  puts "minifying #{js}"
  
  system("#{compressor} --type js target/#{js}.js -o target/#{js}.min.js")

  template = ERB.new(open("src/banner.js.erb").read)
  File.open("target/tmp.min.js", 'w') do |file|
    template = ERB.new(File.open("src/banner.js.erb").read)
    file.write(template.result(binding)) 
    file.write(File.open("target/#{js}.min.js").read)
  end
  system("mv target/tmp.min.js target/#{js}.min.js")
  system("gzip -c target/#{js}.js > target/#{js}.js.gz")
  system("gzip -c target/#{js}.min.js > target/#{js}.min.js.gz")
end

task :deploy do
  AWS::S3::DEFAULT_HOST.replace "s3-eu-west-1.amazonaws.com"
  conn = AWS::S3::Base.establish_connection!(
    :access_key_id => ENV['AWS_ACCESS_KEY_ID'],
    :secret_access_key => ENV['AWS_SECRET_ACCESS_KEY']
  )
  #bucket = AWS::S3::Bucket.find('songkick')
  
  ["songkick-analytics.#{version}", "songkick-analytics.#{version}.min"].each do |js|
    puts "uploading #{js}"
    AWS::S3::S3Object.store(
      "javascripts/#{js}.js", 
      open("target/#{js}.js.gz"), 
      "songkick-static",
      {
        :content_type => "application/javascript",
        :content_encoding => "gzip"
      }
    )
    #get the amazon object
    s3obj = AWS::S3::S3Object.find("javascripts/#{js}.js", "songkick-static")
    #grant a public_read policy to the object grants
    s3obj.acl.grants << AWS::S3::ACL::Grant.grant(:public_read)
    #write the changes to the policy
    s3obj.acl(s3obj.acl)
  end
end
