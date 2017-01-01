// Generated by CoffeeScript 1.11.1
(function() {
  var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.App = window.App || {};

  App.el2array = function(el, def, check, delim) {
    var arrayw, el2array;
    if (def == null) {
      def = "0 0 0";
    }
    if (check == null) {
      check = true;
    }
    if (delim == null) {
      delim = " ";
    }
    el2array = (check && el) || def;
    arrayw = el2array.split(delim);
    arrayw = _.map(arrayw, function(num) {
      return num * 1;
    });
    return arrayw;
  };

  App.Router = (function(superClass) {
    extend(Router, superClass);

    function Router() {
      return Router.__super__.constructor.apply(this, arguments);
    }

    Router.prototype.routes = {
      "new_robot": "new_robot",
      ":id": "change_robot"
    };

    Router.prototype.change_robot = function(id) {
      App.currentrobot.id = id;
      return App.currentrobot.fetch();
    };

    Router.prototype.new_robot = function() {
      return delete App.currentrobot.id;
    };

    return Router;

  })(Backbone.Router);

  App.RobotJoint = (function(superClass) {
    extend(RobotJoint, superClass);

    function RobotJoint() {
      this.jointval = bind(this.jointval, this);
      this.movejoint = bind(this.movejoint, this);
      this.jointogether = bind(this.jointogether, this);
      return RobotJoint.__super__.constructor.apply(this, arguments);
    }

    RobotJoint.prototype.initialize = function() {
      var axis, basicMatrix, position, rotation;
      this.theta = 0;
      this.name = this.attributes.name;
      axis = App.el2array(_.has(this.attributes, "axis") && this.attributes.axis.xyz, "1 0 0");
      this.axis = new THREE.Vector3(axis[0], axis[1], axis[2]);
      rotation = App.el2array(_.has(this.attributes, "origin") && this.attributes.origin.rpy, "0 0 0");
      this.basicrotation = new THREE.Euler(rotation[0], rotation[1], rotation[2]);
      position = App.el2array(_.has(this.attributes, "origin") && this.attributes.origin.xyz, "0 0 0");
      this.basicposition = new THREE.Vector3(position[0], position[1], position[2]);
      this.lower = (_.has(this.attributes, "limit") && this.attributes.limit.lower) || -Math.PI;
      this.upper = (_.has(this.attributes, "limit") && this.attributes.limit.upper) || Math.PI;
      this.lower = this.lower * 1;
      this.upper = this.upper * 1;
      basicMatrix = new THREE.Matrix4();
      this.movementMatrix = new THREE.Matrix4();
      basicMatrix.makeRotationFromEuler(this.basicrotation);
      basicMatrix.setPosition(this.basicposition);
      this.basicMatrix = basicMatrix;
      this.currentMatrix = new THREE.Matrix4();
      this.type = this.attributes.type;
      this.on("change:linkcollection", this.jointogether);
      return this;
    };

    RobotJoint.prototype.jointogether = function() {
      var child, parent;
      if (_.has(this.attributes, "parent") && _.has(this.attributes, "child") && _.has(this.attributes, "linkcollection")) {
        child = this.get("linkcollection").get(this.attributes.child.link);
        parent = this.get("linkcollection").get(this.attributes.parent.link);
        this.parentobject3d = parent.get("link");
        this.childobject3d = child.get("link");
        this.parentobject3d.add(this.childobject3d);
        this.childobject3d.matrixAutoUpdate = false;
        return this.childobject3d.matrix = this.basicMatrix;
      }
    };

    RobotJoint.prototype.movejoint = function(t1, t2) {
      var tempMatrix, tempaxis;
      t1 = t1 != null ? t1 : this.theta;
      tempMatrix = new THREE.Matrix4();
      tempaxis = new THREE.Vector3().copy(this.axis);
      if ((this.upper != null) && (this.lower != null)) {
        t1 = Math.max(this.lower, Math.min(t1, this.upper));
      }
      if (this.type === "continuous" || ((this.upper >= t1 && t1 >= this.lower))) {
        switch (this.type) {
          case "revolute":
            this.movementMatrix = tempMatrix.makeRotationAxis(this.axis, t1);
            break;
          case "continuous":
            this.movementMatrix = tempMatrix.makeRotationAxis(this.axis, t1);
            break;
          case "prismatic":
            this.movementMatrix = tempMatrix.setPosition(tempaxis.multiplyScalar(t1));
            break;
          case "fixed":
            this.movementMatrix.identity();
            break;
          case "planar":
            this.movementMatrix.identity();
        }
        this.theta = t1;
      } else {
        this.movementMatrix.identity();
        return false;
      }
      this.currentMatrix.multiplyMatrices(this.basicMatrix, this.movementMatrix);
      this.childobject3d.matrix = this.currentMatrix;
      return this;
    };

    RobotJoint.prototype.jointval = function() {
      return this.theta;
    };

    return RobotJoint;

  })(Backbone.Model);

  window.true_mod = function(x, m) {
    return (x % m + m) % m;
  };

  App.RobotTrajectory = (function(superClass) {
    extend(RobotTrajectory, superClass);

    function RobotTrajectory() {
      this.clear_trajectory = bind(this.clear_trajectory, this);
      this.add_to_trajectory = bind(this.add_to_trajectory, this);
      this.new_name = bind(this.new_name, this);
      return RobotTrajectory.__super__.constructor.apply(this, arguments);
    }

    RobotTrajectory.prototype.initialize = function(name) {
      var i, j, material, ref;
      this.trajectory = new THREE.Shape();
      this.link_name = this.attributes.name;
      this.allpoints = new THREE.Geometry();
      this.N = 1000;
      for (i = j = 0, ref = this.N; j <= ref; i = j += 1) {
        this.allpoints.vertices.push(new THREE.Vector3(0.0, 0.0, 1.0));
      }
      this.n = 0;
      this.throttled_add_to_trajectory = _.throttle(this.add_to_trajectory, 20);
      material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 3
      });
      this.line = new THREE.Line(this.allpoints, material);
      window.scene.add(this.line);
      return true;
    };

    RobotTrajectory.prototype.new_name = function(name) {
      this.attributes.name = name;
      this.link_name = name;
      this.clear_trajectory();
      return true;
    };

    RobotTrajectory.prototype.add_to_trajectory = function() {
      var diff, error, j, lastvector, len, matrix, newpoint, numbers, ref, ref1;
      try {
        matrix = window.robotlinkcollection.get(this.link_name).get("link").matrixWorld.elements;
        newpoint = new THREE.Vector3(matrix[12], matrix[13], matrix[14]);
        len = 1000;
        lastvector = this.allpoints.vertices[true_mod(this.n - 1, this.N)];
        diff = new THREE.Vector3();
        diff.subVectors(newpoint, lastvector);
        len = diff.length();
        if (len > 0.0001) {
          if (this.n < this.N) {
            this.allpoints.vertices[this.n] = newpoint;
            for (numbers = j = ref = this.n, ref1 = this.N; j <= ref1; numbers = j += 1) {
              this.allpoints.vertices[numbers] = newpoint;
            }
          } else {
            this.allpoints.vertices.shift();
            this.allpoints.vertices.push(newpoint);
          }
          this.allpoints.verticesNeedUpdate = true;
          this.allpoints.elementsNeedUpdate = true;
          this.n++;
        } else {
          return false;
        }
      } catch (error1) {
        error = error1;
        console.log("couldn't find link:" + name);
        console.log(error);
      }
      return false;
    };

    RobotTrajectory.prototype.clear_trajectory = function() {
      var i, j, ref;
      for (i = j = 0, ref = this.N; j <= ref; i = j += 1) {
        this.allpoints.vertices[i].set(0, 0, 0);
      }
      this.allpoints.verticesNeedUpdate = true;
      this.allpoints.elementsNeedUpdate = true;
      return this.n = 0;
    };

    return RobotTrajectory;

  })(Backbone.Model);

  App.RobotLink = (function(superClass) {
    extend(RobotLink, superClass);

    function RobotLink() {
      this.clearthislink = bind(this.clearthislink, this);
      return RobotLink.__super__.constructor.apply(this, arguments);
    }

    RobotLink.prototype.initialize = function() {
      var link;
      this.robotBaseMaterial = new THREE.MeshPhongMaterial({
        color: 0x6E23BB,
        specular: 0x6E23BB,
        shininess: 10
      });
      this.id = this.get("name");
      this.makeobject3d();
      link = new THREE.Object3D();
      link.name = this.get("name");
      link.add(this.meshvis);
      this.set("link", link);
      return this;
    };

    RobotLink.prototype.makeobject3d = function() {
      var boxsize, color, length, orientation, position, radius;
      if (_.has(this.attributes, "visual")) {
        if (_.has(this.attributes.visual, "material")) {
          color = this.get("materialcollection").get(this.attributes.visual.material.name).get("color");
          this.robotBaseMaterial.color = color;
          this.robotBaseMaterial.specular = color;
          this.robotBaseMaterial.color = color;
        }
        if (_.has(this.attributes.visual.geometry, "box")) {
          boxsize = App.el2array(this.attributes.visual.geometry.box.size, "0 0 0");
          this.makebox(boxsize);
        } else if (_.has(this.attributes.visual.geometry, "cylinder")) {
          length = this.attributes.visual.geometry.cylinder.length || 0;
          radius = this.attributes.visual.geometry.cylinder.radius || 0;
          this.makecylinder(length, radius);
        } else if (_.has(this.attributes.visual.geometry, "sphere")) {
          radius = this.attributes.visual.geometry.sphere.radius || 0;
          this.makesphere(radius);
        } else {
          this.makeempty();
        }
        position = App.el2array(_.has(this.attributes.visual, "origin") && this.attributes.visual.origin.xyz, "0 0 0");
        orientation = App.el2array(_.has(this.attributes.visual, "origin") && this.attributes.visual.origin.rpy, "0 0 0");
        this.meshvis.position.set(position[0], position[1], position[2]);
        this.meshvis.setRotationFromEuler(new THREE.Euler(orientation[0], orientation[1], orientation[2]));
        console.log(this.meshvis.rotation);
        return this;
      } else {
        console.log("there are no visual attributes");
        this.makeempty();
        return this;
      }
    };

    RobotLink.prototype.makecylinder = function(length, radius) {
      var meshvis;
      meshvis = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 500, 1), this.robotBaseMaterial);
      meshvis.setRotationFromEuler(new THREE.Euler(Math.PI / 2, 0.0, 0.0, 'XYZ'));
      console.log(meshvis.rotation);
      this.meshvis = new THREE.Mesh();
      return this.meshvis.add(meshvis);
    };

    RobotLink.prototype.makebox = function(boxsize) {
      return this.meshvis = new THREE.Mesh(new THREE.CubeGeometry(boxsize[0] * 1, boxsize[1] * 1, boxsize[2] * 1), this.robotBaseMaterial);
    };

    RobotLink.prototype.makesphere = function(radius) {
      return this.meshvis = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 20), this.robotBaseMaterial);
    };

    RobotLink.prototype.makeempty = function() {
      return this.meshvis = new THREE.Mesh();
    };

    RobotLink.prototype.clearthislink = function() {
      return this.destroy();
    };

    return RobotLink;

  })(Backbone.Model);

  App.RobotMaterial = (function(superClass) {
    extend(RobotMaterial, superClass);

    function RobotMaterial() {
      return RobotMaterial.__super__.constructor.apply(this, arguments);
    }

    RobotMaterial.prototype.initialize = function() {
      var check, def, rgba;
      this.id = this.get("name");
      if (_.has(this.attributes, "color")) {
        rgba = App.el2array(_.has(this.attributes.color, "rgba") && this.attributes.color.rgba, def = "0 0 0 1", check = true);
        this.set("color", new THREE.Color().setRGB(rgba[0], rgba[1], rgba[2]));
      }
      return this;
    };

    return RobotMaterial;

  })(Backbone.Model);

  App.RobotMaterialCollection = (function(superClass) {
    extend(RobotMaterialCollection, superClass);

    function RobotMaterialCollection() {
      return RobotMaterialCollection.__super__.constructor.apply(this, arguments);
    }

    RobotMaterialCollection.prototype.model = App.RobotMaterial;

    return RobotMaterialCollection;

  })(Backbone.Collection);

  App.RobotLinkCollection = (function(superClass) {
    extend(RobotLinkCollection, superClass);

    function RobotLinkCollection() {
      return RobotLinkCollection.__super__.constructor.apply(this, arguments);
    }

    RobotLinkCollection.prototype.model = App.RobotLink;

    return RobotLinkCollection;

  })(Backbone.Collection);

  App.RobotJointCollection = (function(superClass) {
    extend(RobotJointCollection, superClass);

    function RobotJointCollection() {
      return RobotJointCollection.__super__.constructor.apply(this, arguments);
    }

    RobotJointCollection.prototype.model = App.RobotJoint;

    return RobotJointCollection;

  })(Backbone.Collection);

  App.RobotJointManipAll = (function(superClass) {
    extend(RobotJointManipAll, superClass);

    function RobotJointManipAll() {
      this.jointsval = bind(this.jointsval, this);
      this.changejointval = bind(this.changejointval, this);
      this.changepose = bind(this.changepose, this);
      this.add2gui = bind(this.add2gui, this);
      return RobotJointManipAll.__super__.constructor.apply(this, arguments);
    }

    RobotJointManipAll.prototype.el = $("#menu");

    RobotJointManipAll.prototype.jointsdict = {};

    RobotJointManipAll.prototype.initialize = function() {
      this.gui = this.options.gui || new dat.GUI();
      this.joints = this.options.joints;
      this.anglesfolder = this.gui.addFolder("Joint values");
      return this.joints.each(this.add2gui);
    };

    RobotJointManipAll.prototype.add2gui = function(joint) {
      return this.jointsdict[joint.get("name")] = new App.RobotJointManipSingle({
        joint: joint,
        gui: this.anglesfolder
      });
    };

    RobotJointManipAll.prototype.changepose = function(posearray, namesarray) {
      var index, j, len1, name;
      if (posearray.length !== namesarray.length) {
        console.log("pose and namearray have different lengths");
        return false;
      }
      for (index = j = 0, len1 = namesarray.length; j < len1; index = ++j) {
        name = namesarray[index];
        this.changejointval(name, posearray[index]);
      }
      return this;
    };

    RobotJointManipAll.prototype.changejointval = function(name, value) {
      this.jointsdict[name].changeval(value, true);
      return this;
    };

    RobotJointManipAll.prototype.jointsval = function(names) {
      var movable, values;
      if (!(names != null) || names === "" || names.length === 0) {
        movable = this.joints.filter(function(joint) {
          return joint.type !== "fixed";
        });
        names = _.pluck(movable, "name");
      }
      values = _.map(names, function(name) {
        return this.jointsdict[name].jointval();
      }, this);
      return [values, names];
    };

    return RobotJointManipAll;

  })(Backbone.View);

  App.AllRobots = (function(superClass) {
    extend(AllRobots, superClass);

    function AllRobots() {
      return AllRobots.__super__.constructor.apply(this, arguments);
    }

    AllRobots.prototype.model = App.RobotURDF;

    return AllRobots;

  })(Backbone.Collection);

  App.AllCSVs = (function(superClass) {
    extend(AllCSVs, superClass);

    function AllCSVs() {
      return AllCSVs.__super__.constructor.apply(this, arguments);
    }

    return AllCSVs;

  })(Backbone.Collection);

  App.RobotURDF = (function(superClass) {
    extend(RobotURDF, superClass);

    function RobotURDF() {
      return RobotURDF.__super__.constructor.apply(this, arguments);
    }

    RobotURDF.prototype.initialize = function() {
      this.on("change", this.change_address);
      return true;
    };

    RobotURDF.prototype.change_address = function() {
      return App.router.navigate("/" + this.id);
    };

    return RobotURDF;

  })(Backbone.Model);

  App.RobotJointManipSingle = (function(superClass) {
    extend(RobotJointManipSingle, superClass);

    function RobotJointManipSingle() {
      this.jointval = bind(this.jointval, this);
      this.changeval = bind(this.changeval, this);
      return RobotJointManipSingle.__super__.constructor.apply(this, arguments);
    }

    RobotJointManipSingle.prototype.initialize = function() {
      this.joint = this.options.joint;
      this.gui = this.options.gui;
      this.dummy = {};
      this.dummy["val"] = 0.01;
      if (this.joint.type !== "fixed") {
        this.controller = this.gui.add(this.dummy, 'val', this.joint.lower, this.joint.upper, 0.01).name(this.joint.get("name"));
        this.dummy["val"] = 0;
        this.controller.updateDisplay();
        return this.controller.onChange(this.changeval);
      }
    };

    RobotJointManipSingle.prototype.changeval = function(value, updateController) {
      if (updateController == null) {
        updateController = false;
      }
      if (this.joint.movejoint(value)) {
        this.dummy["val"] = value;
        if (updateController) {
          this.dummy["val"] = value;
          this.controller.updateDisplay();
        }
      } else {
        console.log(this.joint.get("name") + " not between min max");
      }
      return this;
    };

    RobotJointManipSingle.prototype.jointval = function() {
      var jointv;
      jointv = this.joint.jointval();
      if ((this.dummy["val"] = !jointv)) {
        this.dummy["val"] = jointv;
        this.controller.updateDisplay();
      }
      return jointv;
    };

    return RobotJointManipSingle;

  })(Backbone.View);

  window.clearall = function(scene, robot, jointcollection, modelcollection) {
    scene.remove(robot);
    jointcollection.reset();
    return modelcollection.reset();
  };

  App.RobotForm = (function(superClass) {
    extend(RobotForm, superClass);

    function RobotForm() {
      this.sideView = bind(this.sideView, this);
      this.topView = bind(this.topView, this);
      this.frontView = bind(this.frontView, this);
      this.closeScreenshot = bind(this.closeScreenshot, this);
      this.changeURDFval = bind(this.changeURDFval, this);
      return RobotForm.__super__.constructor.apply(this, arguments);
    }

    RobotForm.prototype.el = $("#controldiv");

    RobotForm.prototype.events = {
      "click #loadbutton": "resetNload",
      "click #screenshot": "showScreenshot",
      "click #screenshotplace": "closeScreenshot",
      "click #frontview": "frontView",
      "click #topview": "topView",
      "click #sideview": "sideView",
      "click #saverobot": "saveRobot",
      "change #visible": "visible"
    };

    RobotForm.prototype.initialize = function() {
      $(".robotlink").on("click", this.changeURDF);
      return this.listenTo(this.model, "change", this.newRobot);
    };

    RobotForm.prototype.visible = function() {
      return this.model.set({
        "visible": $('#visible').prop('checked')
      });
    };

    RobotForm.prototype.saveRobot = function() {
      this.resetNload();
      return this.model.save();
    };

    RobotForm.prototype.newRobot = function() {
      if (window.robotlinkcollection != null) {
        window.clearall(window.scene, window.robot, window.robotjointcollection, window.robotlinkcollection);
      }
      if (window.parseRobot(this.model.attributes.urdf)) {
        App.setupGui();
        App.animate();
        $("#robottext").val(this.model.attributes.urdf);
        return $('#visible').prop('checked', this.model.attributes.visible);
      } else {
        return window.alert("there was something wrong with your URDF");
      }
    };

    RobotForm.prototype.resetNload = function() {
      var urdffromform;
      urdffromform = $(this.el).find("#robottext").val();
      return this.model.set({
        urdf: urdffromform
      });
    };

    RobotForm.prototype.changeURDF = function(event) {
      var linkval;
      event.preventDefault();
      linkval = $(this).attr("href");
      $.get(linkval, App.forumula.changeURDFval);
      return true;
    };

    RobotForm.prototype.changeURDFval = function(xmlval) {
      var textval;
      textval = (new XMLSerializer()).serializeToString(xmlval);
      $("#robottext").val(textval);
      return true;
    };

    RobotForm.prototype.showScreenshot = function() {
      var img1;
      App.render();
      img1 = window.renderer.domElement.toDataURL("image/png");
      $("#screenshotplace").html('<img src="' + img1 + '"/>');
      return $("#screenshottext").text("Click image to close");
    };

    RobotForm.prototype.closeScreenshot = function() {
      $("#screenshotplace").html('');
      return $("#screenshottext").text("");
    };

    RobotForm.prototype.frontView = function() {
      console.log(App.camera.position);
      App.camera.position.set(5.12, 0, 0);
      return App.camera;
    };

    RobotForm.prototype.topView = function() {
      App.camera.position.set(0, 0, 5.12);
      return App.camera;
    };

    RobotForm.prototype.sideView = function() {
      App.camera.position.set(0, 5.12, 0);
      return App.camera;
    };

    return RobotForm;

  })(Backbone.View);

  App.Clock = (function(superClass) {
    extend(Clock, superClass);

    function Clock(autostart, zeroTime) {
      this.zeroTime = zeroTime;
      if (this.zeroTime == null) {
        this.zeroTime = 0;
      }
      Clock.__super__.constructor.call(this, autostart);
    }

    Clock.prototype.start = function(zerotime) {
      Clock.__super__.start.apply(this, arguments);
      this.zeroTime = zerotime != null ? zerotime : this.zeroTime;
      this.oldTime = this.oldTime - this.zeroTime;
      return this;
    };

    Clock.prototype.stop = function() {
      Clock.__super__.stop.apply(this, arguments);
      return this;
    };

    Clock.prototype.reset = function() {
      this.stop().elapsedTime = 0;
      return this;
    };

    Clock.prototype.set = function(timeinsec) {
      this.zerotime = timeinsec;
      this.elapsedTime = timeinsec;
      return this;
    };

    return Clock;

  })(THREE.Clock);

  App.TrajectoryView = (function(superClass) {
    extend(TrajectoryView, superClass);

    function TrajectoryView() {
      return TrajectoryView.__super__.constructor.apply(this, arguments);
    }

    TrajectoryView.prototype.el = $("#trajectory");

    TrajectoryView.prototype.initialize = function() {
      this.tracing = false;
      return this.robot_trajectory = new App.RobotTrajectory("Nothing");
    };

    TrajectoryView.prototype.create_list = function() {
      $("#all_links").empty();
      window.robotlinkcollection.each(function(link) {
        var linkname;
        linkname = link.get("name");
        return $("#all_links").append(new Option(linkname, linkname));
      });
      this.tracing = false;
      $("#tracebutton").removeClass("btn-danger").addClass("btn-success");
      this.clear;
      return true;
    };

    TrajectoryView.prototype.events = {
      "click #tracebutton": "trace",
      "click #clear_trajectory": "clear"
    };

    TrajectoryView.prototype.clear = function() {
      console.log("clearing");
      return this.robot_trajectory.clear_trajectory();
    };

    TrajectoryView.prototype.trace = function() {
      var name;
      console.log("tracing");
      if (!this.tracing) {
        name = $("#all_links").val();
        if ((name != null) && name !== "") {
          this.robot_trajectory.new_name(name);
          this.tracing = true;
          $("#tracebutton").removeClass("btn-success").addClass("btn-danger");
        }
      } else {
        this.tracing = false;
        $("#tracebutton").removeClass("btn-danger").addClass("btn-success");
      }
      return true;
    };

    TrajectoryView.prototype.update = function() {
      if (this.tracing) {
        this.robot_trajectory.throttled_add_to_trajectory();
      }
      return true;
    };

    return TrajectoryView;

  })(Backbone.View);

  App.AnimationForm = (function(superClass) {
    extend(AnimationForm, superClass);

    function AnimationForm() {
      this.prevstep = bind(this.prevstep, this);
      this.nextstep = bind(this.nextstep, this);
      this.settostaticframe = bind(this.settostaticframe, this);
      this.update = bind(this.update, this);
      this.pause = bind(this.pause, this);
      this.stop = bind(this.stop, this);
      this.play = bind(this.play, this);
      this.findframetoshow = bind(this.findframetoshow, this);
      this.prepareArraysfromCSV = bind(this.prepareArraysfromCSV, this);
      this.prettify = bind(this.prettify, this);
      this.loadURDFfromForm = bind(this.loadURDFfromForm, this);
      return AnimationForm.__super__.constructor.apply(this, arguments);
    }

    AnimationForm.prototype.el = $("#animdiv");

    AnimationForm.prototype.names = [];

    AnimationForm.prototype.poses = [];

    AnimationForm.prototype.times = [];

    AnimationForm.prototype.deltaTime = 0.06;

    AnimationForm.prototype.curframe = 0;

    AnimationForm.prototype.hastimes = false;

    AnimationForm.prototype.initialize = function() {
      this.curtime = new App.Clock(false);
      this.robotcontroller = this.options.robotcontroller;
      this.zerotime = 0;
      this.state = "stopped";
      this.textform = $("#robotcsv");
      this.lh = 18;
      this.line_height_value = "" + this.lh + "px";
      return this.textform.css("line-height", this.line_height_value);
    };

    AnimationForm.prototype.events = {
      "click #loadcsv": "loadURDFfromForm",
      "keydown #robotcsv": "pp",
      "click #playbutton": "playbutton",
      "click #pausebutton": "pausebutton",
      "click #stopbutton": "stopbutton",
      "click #nextbutton": "nextstep",
      "click #prevbutton": "prevstep",
      "click #addposition": "addposition",
      "click #save": "saverobot"
    };

    AnimationForm.prototype.saverobot = function() {
      return document.getElementById("robotform").submit();
    };

    AnimationForm.prototype.addposition = function() {
      var addtime, currentstate;
      currentstate = this.robotcontroller.jointsval(this.names);
      if (this.names.length === 0) {
        this.textform.val("time," + currentstate[1] + "\n" + "0.0," + currentstate[0]);
        this.hastimes = true;
      } else {
        addtime = "";
        if (this.hastimes) {
          addtime += (this.deltaTime + parseFloat(_.last(this.times))) + ",";
        }
        this.textform.val(this.textform.val() + addtime + currentstate[0]);
      }
      return this.loadURDFfromForm();
    };

    AnimationForm.prototype.playbutton = function() {
      if (this.state === "finished") {
        this.stop();
      }
      this.state = "playing";
      this.curtime.start();
      return this.play();
    };

    AnimationForm.prototype.stopbutton = function() {
      this.state = "stopped";
      this.stop();
      return this.robotcontroller.changepose(this.poses[0], this.names);
    };

    AnimationForm.prototype.pausebutton = function() {
      this.state = "paused";
      return this.pause();
    };

    AnimationForm.prototype.pp = function(e) {
      e.stopPropagation();
      return this;
    };

    AnimationForm.prototype.loadURDFfromForm = function() {
      var formcsv;
      formcsv = this.textform.val();
      formcsv = $.trim(formcsv);
      this.prepareArraysfromCSV(formcsv);
      this.textform.val(formcsv + "\n");
      return this;
    };

    AnimationForm.prototype.prettify = function() {
      this.textform.scrollTop(this.lh * (this.curframe + 1));
      if (this.curframe > 0) {
        $("#jointnames").text(this.names + "");
      } else {
        $("#jointnames").text(".");
      }
      return this;
    };

    AnimationForm.prototype.prepareArraysfromCSV = function(csvstring) {
      var allfromcsv, body, head, lastn;
      this.names = [];
      this.poses = [];
      this.times = [];
      allfromcsv = CSVToArray(csvstring);
      if (allfromcsv.length < 2) {
        console.log("It should have at least names and one pose row");
        return false;
      }
      head = allfromcsv[0];
      body = allfromcsv.slice(1);
      this.hastimes = head[0] === "time";
      if (this.hastimes) {
        this.names = _.rest(head);
        body = _.sortBy(body, function(element) {
          return parseFloat(_.first(element));
        });
        _.each(body, function(element) {
          this.times.push(parseFloat(_.first(element)));
          return this.poses.push(_.rest(element));
        }, this);
      } else {
        this.names = head;
        _.each(body, function(element) {
          return this.poses.push(element);
        }, this);
        lastn = this.poses.length;
        this.times = _.range(0, lastn);
        this.times = _.map(this.times, function(time) {
          return time * this.deltaTime;
        }, this);
      }
      return this;
    };

    AnimationForm.prototype.findframetoshow = function(currtime) {
      var frame;
      frame = this.curframe;
      while ((frame <= this.times.length) && (this.times[frame + 1] < currtime)) {
        frame += 1;
      }
      return frame;
    };

    AnimationForm.prototype.play = function() {
      var currtime, pose;
      currtime = this.curtime.getElapsedTime();
      this.curframe = this.findframetoshow(currtime);
      pose = this.poses[this.curframe];
      if (this.curframe >= (this.times.length - 1)) {
        this.state = "finished";
      }
      if (pose !== this.pose) {
        this.robotcontroller.changepose(pose, this.names);
      }
      this.pose = pose;
      this.prettify();
      return this;
    };

    AnimationForm.prototype.stop = function() {
      this.savetime = 0;
      this.curframe = 0;
      this.curtime.reset();
      this.state = "stopped";
      this.prettify();
      return this;
    };

    AnimationForm.prototype.pause = function() {
      this.savetime = this.curtime.getElapsedTime();
      this.curtime.stop();
      this.state = "paused";
      return this;
    };

    AnimationForm.prototype.update = function() {
      if (this.state === "playing") {
        this.play();
      }
      return this;
    };

    AnimationForm.prototype.settostaticframe = function(framenum) {
      var pose;
      pose = this.poses[framenum];
      this.robotcontroller.changepose(pose, this.names);
      this.curframe = framenum;
      this.curtime.set(this.times[framenum]);
      return this;
    };

    AnimationForm.prototype.nextstep = function() {
      var testframe;
      this.state = "stepmode";
      testframe = this.curframe + 1;
      if (testframe >= this.times.length) {

      } else {
        this.settostaticframe(testframe);
      }
      return this.prettify();
    };

    AnimationForm.prototype.prevstep = function() {
      var testframe;
      this.state = "stepmode";
      testframe = this.curframe - 1;
      if (testframe < 0) {

      } else {
        this.settostaticframe(testframe);
      }
      return this.prettify();
    };

    return AnimationForm;

  })(Backbone.View);

  App.notsofast = _.throttle(function(tekkx) {
    console.log(tekkx);
    return true;
  }, 1000);

}).call(this);
