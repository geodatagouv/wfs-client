const libxml = require('libxmljs')
const {forEach, size} = require('lodash')
const {isString} = require('./util')

exports.mapper = function (definition, ns) {
  const buildTextValue = function (node) {
    if (!node) {
      return null
    }

    let value
    if (node.type() === 'attribute') {
      value = node.value()
    }

    if (node.type() === 'element') {
      value = node.text()
    }

    if (!value || value.length === 0) {
      return null
    }

    return value
  }

  const buildArray = function (nodes, type) {
    if (!nodes || nodes.length === 0) {
      return null
    }

    const result = []
    nodes.forEach(node => {
      const value = type ? buildObject(node, type) : buildTextValue(node)
      if (value) {
        result.push(value)
      }
    })
    return result.length > 0 ? result : null
  }

  const buildObject = function (node, type) {
    if (!node) {
      return null
    }

    const result = {}
    forEach(definition[type], (params, xpath) => {
      if (isString(params)) {
        params = {dest: params}
      }

      let value
      if (params.multi) {
        value = buildArray(node.find(xpath, ns), params.type)
      } else if (params.type) {
        value = buildObject(node.get(xpath, ns), params.type)
      } else {
        value = buildTextValue(node.get(xpath, ns))
      }

      if (value) {
        result[params.dest] = value
      }
    })
    return size(result) ? result : null
  }

  return {buildTextValue, buildArray, buildObject}
}

const parserOptions = {
  noblanks: true,
  noent: true,
  nocdata: true
}

exports.parse = body => {
  return libxml.parseXml(body, parserOptions)
}
