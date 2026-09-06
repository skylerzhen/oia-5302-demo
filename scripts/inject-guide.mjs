#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'scripts/demo-guide-body.html')
const OUT = path.join(ROOT, 'deliverables/demo-5302/demo-operation-guide.html')
let html = fs.readFileSync(SRC, 'utf8')
if (html.includes('id="whatsnew"')) {
  console.log('Guide already includes whats-new section — copying to deliverable only')
  fs.writeFileSync(OUT, html, 'utf8')
  console.log('OK', OUT)
  process.exit(0)
}
const cssExtra = '.feature-tag{display:inline-block;font-size:.72rem;padding:.15rem .45rem;border-radius:999px;background:#eff6ff;color:#1d4ed8;margin-right:.35rem;font-weight:500}.block h5{margin:1rem 0 .35rem;font-size:.92rem;color:var(--navy)}'
html = html.replace('.block li{margin:.25rem 0}', '.block li{margin:.25rem 0}'+cssExtra)

const navNew = '<li><a href="#whatsnew">\u6700\u65b0\u7248\u5b8c\u5584\u529f\u80fd</a></li>'
html = html.replace('<li><a href="#start">', navNew + '<li><a href="#start">')

html = html.replace(
  '<p>\u9762\u5411\u6f14\u793a\u8005\u3001\u9a8c\u6536\u6d4b\u8bd5\u4e0e\u73b0\u573a\u6f14\u793a\u3002\u8986\u76d6\u542f\u52a8\u65b9\u5f0f\u3001\u53cc portal \u6d41\u7a0b\u3001C4 \u9762\u8bd5\u3001HR \u5b9e\u65f6\u76d1\u63a7\u4e0e Journey \u8df3\u6b65\u3002</p>',
  '<p>\u9762\u5411\u6f14\u793a\u4eba\u5458\u4e0e\u9a8c\u6536\u6d4b\u8bd5\u3002\u672c\u7248\u5728\u5e73\u53f0 UI\u3001\u53cc portal \u534f\u540c\u3001AI \u9762\u8bd5\u4e0e HR \u5b9e\u65f6\u76d1\u63a7\u7b49\u65b9\u9762\u5747\u6709\u5b8c\u5584 \u2014 \u4e0b\u6587\u300c\u6700\u65b0\u7248\u5b8c\u5584\u529f\u80fd\u300d\u4e3a\u6f14\u793a\u91cd\u70b9\u3002</p>',
)
html = html.replace(
  '<div class="hero-tags"><span>Candidate C1\u2013C6</span><span>HR H1\u2013H5</span><span>Journey J01\u2013J12</span><span>\u53cc\u6807\u7b7e\u540c\u6b65</span></div>',
  '<div class="hero-tags"><span>\u5e73\u53f0 UI \u5347\u7ea7</span><span>\u53cc\u6807\u7b7e\u540c\u6b65</span><span>Live \u9762\u8bd5\u76d1\u63a7</span><span>HR \u63a8\u9898</span><span>C4 \u65ad\u7ebf\u6062\u590d</span></div>',
)

const whatsNew = [
  '<div class="section-head" id="whatsnew"><span class="section-dot" style="background:#2563eb"></span><h3>\u6700\u65b0\u7248\u5b8c\u5584\u529f\u80fd</h3></div>',

  '<article class="block"><h4>\u603b\u89c8</h4><ul>',
  '<li>\u672c\u7248\u5728<strong>\u5e73\u53f0\u89c6\u89c9</strong>\u3001<strong>\u53cc portal \u6570\u636e\u540c\u6b65</strong>\u3001<strong>AI \u6570\u5b57\u4eba\u9762\u8bd5</strong>\u4e0e<strong>HR \u5b9e\u65f6\u76d1\u63a7</strong>\u56db\u6761\u7ebf\u5747\u6709\u660e\u663e\u5b8c\u5584\uff0c\u9002\u5408\u4f5c\u4e3a UIS \u9a8c\u6536\u4e0e\u5bf9\u5916\u6f14\u793a\u4e3b\u7ebf\u3002</li>',
  '<li>\u7ebf\u4e0a\u5730\u5740\uff1a<a href="https://oia-recruitment.uiscloud.cc">oia-recruitment.uiscloud.cc</a></li>',
  '</ul></article>',

  '<article class="block"><h4>\u4e00\u3001\u5e73\u53f0 UI \u4e0e\u4f53\u9a8c</h4>',
  '<h5><span class="feature-tag">\u89c6\u89c9</span>\u653f\u4f01\u7ea7\u5e73\u53f0\u58f3\u5c42</h5><ul>',
  '<li>\u7edf\u4e00\u6d77\u519b\u84dd\u8bbe\u8ba1\u4f53\u7cfb\uff0c\u53cc portal \u91c7\u7528\u56fa\u5b9a\u4fa7\u680f + \u9876\u680f app-shell \u5e03\u5c40</li>',
  '<li>\u4fa7\u680f\u6539\u4e3a\u4e1a\u52a1\u6b65\u9aa4\u540d + \u5b8c\u6210\u6001\u6807\u8bb0\uff0c\u9875\u9762\u6807\u9898\u4ea7\u54c1\u5316\uff0c\u4e0d\u518d\u5bf9\u5916\u5f3a\u8c03 C1\u2013C6 \u5185\u90e8\u7f16\u53f7</li>',
  '<li>Landing \u4e09\u901a\u9053\u5165\u53e3\uff08Candidate / HR / Journey\uff09+ Mock SSO / MFA \u767b\u5f55\u6d41\u7a0b</li>',
  '</ul>',
  '<h5><span class="feature-tag">\u5019\u9009\u4eba</span>C5 \u7efc\u5408\u8bc4\u5206\u6307\u6325\u9875</h5><ul>',
  '<li>CV / \u6d4b\u8bc4 / \u9762\u8bd5\u4e09\u67f1\u52a0\u6743\u5408\u6210\uff0c\u4e0e HR H4 \u6743\u91cd\u4e00\u81f4</li>',
  '<li>\u516d\u7ef4\u5ea6\u6210\u5c31\u7387\u3001CV \u539f\u6587\u8bc1\u636e\u94fe\u3001\u6539\u8fdb\u5efa\u8bae\u4e0e\u516c\u5f0f\u900f\u660e\u5c55\u793a</li>',
  '</ul>',
  '<h5><span class="feature-tag">\u8bc1\u636e</span>Evidence Review \u6846\u67b6</h5><ul>',
  '<li>CV \u53cc\u680f\u5ba1\u9605\u3001\u9762\u8bd5\u56de\u653e\u8bc4\u4f30\u3001Evidence \u9ad8\u4eae\u56de\u94fe\u539f\u6587</li>',
  '</ul></article>',

  '<article class="block"><h4>\u4e8c\u3001\u53cc Portal \u534f\u540c</h4><ul>',
  '<li><strong>\u540c\u4e00\u6d4f\u89c8\u5668\u53cc\u6807\u7b7e</strong>\uff1a\u5019\u9009\u4eba\u4e0e HR \u8bfb\u5199\u540c\u4e00\u6761\u7533\u8bf7\u8bb0\u5f55\uff0c\u5237\u65b0\u540e\u4ecd\u4e00\u81f4</li>',
  '<li>\u4f1a\u8bdd\u6301\u4e45\u5316\u5347\u7ea7\uff1a\u8de8\u6807\u7b7e\u81ea\u529b\u540c\u6b65\uff0c\u6f14\u793a\u65f6 HR \u53ef\u5b9e\u65f6\u770b\u5230\u5019\u9009\u4eba\u63a8\u8fdb\u72b6\u6001</li>',
  '<li><strong>Journey \u9a8c\u6536\u901a\u9053</strong>\uff1a12 \u6b65\u5bfc\u822a\uff08J01\u2013J12\uff09\uff0c\u53ef\u4e00\u952e\u8df3\u8fdb\u4efb\u610f C/H \u6b65\u9aa4</li>',
  '</ul></article>',

  '<article class="block"><h4>\u4e09\u3001C4 AI \u6570\u5b57\u4eba\u9762\u8bd5</h4><ul>',
  '<li><strong>\u754c\u9762\u805a\u7126</strong>\uff1a\u4ec5\u4fdd\u7559 Avatar \u89c6\u9891 + \u5f53\u524d\u5b57\u5e55 + \u63a7\u4ef6\uff0c\u79fb\u9664\u6613\u6df7\u6dc6\u7684\u53f3\u4fa7\u5386\u53f2 transcript \u5217\u8868</li>',
  '<li><strong>\u65ad\u7ebf\u6062\u590d</strong>\uff1a<strong>Reconnect video</strong> / <strong>Restart interview</strong></li>',
  '<li>LiveAvatar \u81ea\u52a8\u91cd\u8fde\uff1b\u8fdb\u5165 C4 \u65f6\u6e05\u9664\u9648\u65e7 turns\uff0c\u907f\u514d\u65e0\u6cd5\u5f00\u59cb\u6216\u6570\u636e\u9519\u4e71</li>',
  '</ul></article>',

  '<article class="block"><h4>\u56db\u3001HR \u9762\u8bd5\u76d1\u63a7\u4e0e\u63a8\u9898\uff08H1\uff09</h4><ul>',
  '<li><strong>Live interview monitor</strong>\uff1aC4 \u8fdb\u884c\u4e2d\u5b9e\u65f6\u6587\u5b57 transcript\uff08Live \u6807\u8bb0\uff09</li>',
  '<li><strong>Queue for next turn</strong>\uff1aHR \u63a8\u9001\u4e0b\u4e00\u9053 Avatar \u82f1\u6587\u9898\uff0c\u5019\u9009\u4eba\u4e0b\u4e00\u8f6e\u4f18\u5148\u6536\u5230</li>',
  '<li>\u9762\u8bd5\u7ed3\u675f\u540e\u53ef\u8df3\u8f6c H3 \u5b8c\u6574\u56de\u653e\u4e0e LLM \u8bc4\u4f30</li>',
  '</ul></article>',

  '<article class="block"><h4>\u4e94\u3001HR \u5ba1\u9605\u4e0e\u51b3\u7b56</h4><ul>',
  '<li><strong>H3</strong>\uff1a\u9010\u8f6e transcript + \u7ef4\u5ea6\u8bc4\u5206\uff1bPlay recording \u4e3a TTS \u6587\u5b57\u91cd\u6f14</li>',
  '<li><strong>H1 Interview setup</strong>\uff1aJD \u7ef4\u5ea6 + \u81ea\u5b9a\u4e49\u95ee\u9898\u84dd\u56fe</li>',
  '<li><strong>H2</strong>\uff1aDecline \u6587\u6848\u6539\u4e3a Below screening threshold</li>',
  '<li><strong>H4</strong>\uff1a\u53ef\u8c03 pillar \u6743\u91cd\uff0c\u7ec8\u5ba1\u7ed3\u679c\u540c\u6b65\u81f3 C6</li>',
  '</ul></article>',

  '<article class="block"><h4>\u6f14\u793a\u5efa\u8bae\uff08\u65b0\u529f\u80fd\u600e\u4e48\u79c0\uff09</h4><ul>',
  '<li><strong>\u53cc\u6807\u7b7e + Live monitor</strong>\uff1aA \u8d70 C4\u3001B \u5f00 H1\uff0c\u73b0\u573a\u770b transcript \u6eda\u52a8</li>',
  '<li><strong>HR \u63a8\u9898</strong>\uff1aC4 \u4e2d HR \u5728 H1 \u8f93\u5165\u5b9a\u5236\u95ee\u9898\uff0c\u5019\u9009\u4eba\u4e0b\u8f6e\u5373\u542c\u5230</li>',
  '<li><strong>\u65ad\u7ebf\u6062\u590d</strong>\uff1a\u89c6\u9891\u77ed\u65ad\u65f6\u6f14\u793a Reconnect video\uff0c\u52ff\u6574\u9875\u5237\u65b0</li>',
  '<li><strong>UI \u5347\u7ea7</strong>\uff1a\u91cd\u70b9\u5c55\u793a\u4fa7\u680f\u4ea7\u54c1\u5316\u5bfc\u822a\u4e0e C5 \u4e09\u67f1\u8bc4\u5206\u9875</li>',
  '</ul></article>',
].join('')

html = html.replace('<div class="section-head" id="start">', whatsNew + '<div class="section-head" id="start">')

fs.writeFileSync(SRC, html, 'utf8')
fs.writeFileSync(OUT, html, 'utf8')
console.log('OK', OUT)