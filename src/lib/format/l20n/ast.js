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
  constructor(source, string) {
    super();
    this.source = source;
    this.content = string;
  }
}


class Entity extends Node {
  constructor(id, value = null, index = null, attrs = []) {
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

class Attribute extends Node {
  constructor(id, value, index = null) {
    super();
    this.id = id;
    this.value = value;
    this.index = index;
  }
}

class HashItem extends Node {
  constructor(id, value) {
    super();
    this.id = id;
    this.value = value;
  }
}

class Comment extends Node {
  constructor(body) {
    super();
    this.body = body;
  }
}

export default {
  Identifier,
  Value,
  String,
  Entity,
  Resource,
  Attribute,
  HashItem,
  Comment,
};
