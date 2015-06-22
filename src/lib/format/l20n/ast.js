'use strict';

class Node {
  constructor() {
    this.type = this.constructor.name;
  }
}

class Identifier extends Node {
  constructor(name) {
    super();
    this.name = name;
  }
}

class Value extends Node {
  constructor() {
    super();
  }
}

class String extends Value {
  constructor(string) {
    super();
    this.content = string
  }
}


class Entity extends Node {
  constructor(id, value = null, index = [], attrs = []) {
    super();
    this.id = id;
    this.value = value;
    this.index = index;
    this.attrs = attrs;
  }
}

class Resource extends Node {
  constructor() {
    super();
    this.body = [];
  }
}

export default {
  Identifier,
  Value,
  String,
  Entity,
  Resource
};
