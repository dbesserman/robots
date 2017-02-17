$(function() {
  var $robots = $('#robots');
  var $body = $('body');
  var $main = $('main');
  var $forms = $('#forms');
  var $mainNav = $('main nav');

  var templates = {
    manufacturers: Handlebars.compile($('#manufacturers_template').html()),
    pages: Handlebars.compile($('#pages_template').html()), /* pagination */
    robots: Handlebars.compile($('#robots_template').html()),
    robot: Handlebars.compile($('#robot_template').html()),
    show: Handlebars.compile($('#show_template').html()),
    create: Handlebars.compile($('#create_template').html()),
    edit: Handlebars.compile($('#edit_template').html()),
  }

  Handlebars.registerPartial('manufacturer', $('#manufacturer_template').html());
  Handlebars.registerPartial('robot', $('#robot_template').html());
  Handlebars.registerPartial('resource_nav', $('#resource_nav').html());
  Handlebars.registerPartial('page', $('#page_template').html());


  function getFormObject(e) {
    var formObj = {};
    var inputs = $(e.target).closest('form').serializeArray();

    inputs.forEach(function(input) {
      formObj[input['name']] = input['value'];
    });

    return formObj;
  };

  var hexChars = '0123456789abcdef'.split('');

  function randomHex(length) {
    var result = '';
    for (var i = 0; i < length; i++) {
      var idx = Math.floor(Math.random() * hexChars.length);

      result += hexChars[idx];
    }

    return result;
  };

  function Robot(name, manufacturer, id) {
    this.name = name;
    this.manufacturer = manufacturer;
    this.id = id;
    this.image_id = this.genImageId()
    this.serial = this.genSerial();
  }

  Robot.prototype.genImageId = function() {
    return Math.floor(Math.random() * 15) + 1;
  };

  Robot.prototype.genSerial = function() {
    var lengths = [8, 4, 4, 4, 12];

    return lengths.map(function(length) {
      return randomHex(length);
    }).join('-');
  };

  var DisplayParams = {
    params: {
      /* Default values */
      page: 1,
      per_page: 5,
      order: '+',
      manufacturer: 'Any',
    },
    init: function() {
      if (localStorage.getItem('display_params')) {
        this.params = JSON.parse(localStorage.getItem('display_params'));
      } 

      this.setupLayout();
    },
    setManufacturerFilter: function(manufacturer) {
      this.params.manufacturer = manufacturer;
      this.persist();
      this.displayManufacturerFilter();
      this.resetPagination();
    },
    displayManufacturerFilter: function() {
      var buttonText = $('#filter').find('button')[0].firstChild;

      buttonText.nodeValue = 'Filter by manufacturer = ' + this.params.manufacturer + ' ';
    },
    setOrder: function(order) {
      this.params.order = order;
      this.persist();
      this.resetPagination();
      this.displayOrder();
    },
    displayOrder: function() {
      var buttonText = $('#order').find('button')[0].firstChild;

      buttonText.nodeValue = 'Sort by ' + this.params.order + 'name ';
    },
    setRobotsPerPage: function(nb) {
      this.params.per_page = nb;
      this.displayRobotsPerPage();
      this.resetPagination();
      this.persist();
    },
    resetPagination: function() {
      this.params.page = 1;
      this.displayPagination();
    },
    displayRobotsPerPage: function() {
      var buttonText = $('#robots_per_page').find('button')[0].firstChild;

      buttonText.nodeValue = 'Per Page ' + this.params.per_page + ' ';
    },
    setupLayout: function() {
      this.displayPagination();
      this.displayRobotsPerPage();
      this.displayManufacturerFilter();
      this.displayPagination();
    },
    setPage: function(selection) {
      if (selection.charCodeAt(0) === 187) { /* >> */
        this.params.page++;
      } else if (selection.charCodeAt(0) === 171)  { /* << */
        this.params.page--;
      } else {
        this.params.page = parseInt(selection);
      }

      this.displayPagination();
    },
    displayPagination: function() {
      var self = this;
      var paginations = $('.pagination'); 

      paginations.each(function(ul) {
        var lis = $(this).find('li');
        lis.filter('.active').removeClass('active');
        lis.eq(self.params.page).addClass('active');
      });
    },
    persist: function() {
      localStorage.setItem('display_params', JSON.stringify(this.params));
    },
  };

  var Robots = {
    collection: [],
    init: function() {
      if (localStorage.getItem('robots')) {
        this.retrievePersistedRobots();
      } else {
        this.collection = catalog;
        this.persist();
      }
    },
    add: function(name, manufacturer) {
      var robot = new Robot(name, manufacturer, this.nextId())

      this.collection.push(robot);
      this.persist();
    },
    remove: function(id) {
      var idx = this.getIndex(id);

      this.collection.splice(idx, 1);
      this.persist();
    },
    edit: function(id, formObj) {
      var robot = this.find(id);
      
      robot['name'] = formObj['name'];
      robot['manufacturer'] = formObj['manufacturer'];
      this.persist();
    },
    find: function(id) {
      var idx = this.getIndex(id);

      return this.collection[idx];
    },
    getIndex: function(id) {
      /* returns the index in the collection of the robot with the given id */
      var idx;

      this.collection.some(function(robot, i) {
        if (robot.id === id) {
          idx = i;
          return true;
        }
      });

      return idx;
    },
    persist: function() {
      localStorage.setItem('robots', JSON.stringify(this.collection));
    },
    retrievePersistedRobots: function() {
      this.collection = JSON.parse(localStorage.getItem('robots'));
    },
    nextId: function() {
      var ids = this.collection.map(function(robot) {
        return robot.id;
      });
      var max = ids.sort(function(a, b) {
        return b - a;
      })[0];

      return ++max;
    },
    manufacturers: function() {
      var result = ['Any'];

      this.collection.forEach(function(robot) {
        var manufacturer = robot.manufacturer;

        if (result.indexOf(manufacturer) === -1) {
          result.push(manufacturer);
        }
      });

      return result;
    },
    getSelectedRobots: function(params) {
      var manufacturer = params.manufacturer;
      var page = params.page;
      var robotsPerPage = params.per_page;
      var sort = params.order;
      var robotsFilteredByManufacturers = this.getManufacturedBy(manufacturer); 
      var nbOfPages = Math.ceil(robotsFilteredByManufacturers.length / robotsPerPage);
      var sortedRobots = this.getSorted(robotsFilteredByManufacturers, sort);
      var selectedRobots = this.getRobotsOnPage(sortedRobots, page, robotsPerPage);

      this.updatePagination(nbOfPages);
      return selectedRobots;
    },
    updatePagination: function(nbOfPages) {
      var paginations = $('.pagination');
      var pages = [];

      for (var i = 1; i <= nbOfPages; i++) {
        pages.push(i);
      }

      paginations.each(function() {
        $(this).html(templates['pages']({ pages: pages }));
      });
    },
    getManufacturedBy: function(manufacturer) {
      if (manufacturer === 'Any') { 
        return this.collection;
      } else {
        return this.collection.filter(function(robot) {
          if (robot.manufacturer === manufacturer) {
            return true;
          }
        });
      }
    },
    getSorted: function(robots, sort) {
      return robots.sort(function(a, b) {
        var aName = a.name.toLowerCase();
        var bName = b.name.toLowerCase();
        if (sort === '+') {
          if (aName < bName) { return -1 }
          if (aName > bName) { return 1 }
        } else {
          if (aName > bName) { return -1 }
          if (aName < bName) { return 1 }
        }

        return 0;
      });
    },
    getRobotsOnPage: function(robots, page, robotsPerPage) {
      var firstIndex = (page - 1) * robotsPerPage;
      var lastIndex = firstIndex + robotsPerPage;

      return robots.slice(firstIndex, lastIndex)
    },
  }

  var robotsApp = {
    robots: Object.create(Robots),
    displayParams: Object.create(DisplayParams),
    init: function() {
      this.displayParams.init();
      this.robots.init();
      this.updateManufacturersFilter();
      this.displayRobots();
      this.bind();
    },
    bind: function() {
      $body.on('click', '.add', this.displayRobotCreationForm.bind(this));
      $body.on('click', '.show', this.showRobot.bind(this));
      $body.on('click', '.back', this.hideForm.bind(this));
      $body.on('click', '.edit', this.displayEditForm.bind(this));
      $body.on('click', '.delete', this.destroyRobot.bind(this));
      $body.on('click', "#create_form input[type='submit']", this.createRobot.bind(this));
      $body.on('click', "#edit_form input[type='submit']", this.editRobot.bind(this));
      $body.on('click', '.pagination a', this.changePage.bind(this));
      $('#robots_per_page').find('ul').on('click', 'a', this.changeRobotsPerPage.bind(this));
      $('#order').find('ul').on('click', 'a', this.changeOrder.bind(this));
      $('#filter').find('ul').on('click', 'a', this.changeFilter.bind(this));
    },
    changeFilter: function(e) {
      e.preventDefault(e);

      var manufacturer = $(e.target).text();

      this.displayParams.setManufacturerFilter(manufacturer);
      this.displayRobots();
    },
    changeOrder: function(e) {
      e.preventDefault(e);

      var order = $(e.target).text()[0];

      this.displayParams.setOrder(order);
      this.displayRobots();
    },
    changePage: function(e) {
      e.preventDefault();

      var selectedPage = $(e.target).text().trim();

      this.displayParams.setPage(selectedPage);
      this.displayRobots();
    },
    changeRobotsPerPage: function(e) {
      e.preventDefault();

      var nb = parseInt($(e.target).text());

      this.displayParams.setRobotsPerPage(nb);
      this.displayRobots();
    },
    createRobot: function(e) {
      e.preventDefault();

      var formObj = getFormObject(e);

      if (this.anyInvalidInput(formObj)) { 
        this.displayInvalidImputs(formObj);
      } else {
        this.robots.add(formObj['name'], formObj['manufacturer']);
        this.updateManufacturersFilter();
        this.displayRobots();
        this.hideForm()
      }
    },
    displayInvalidImputs: function(formObj) {
      for (prop in formObj) {
        var $input = $('#' + prop);
        var $dl = $input.closest('dl');

        if (formObj[prop] === '' && !$dl.hasClass('invalid')) { /* Invalid Input, Not displayed yet */
          $dl.addClass('invalid'); 
          $dl.append('<dd>"' + prop + '" is required</dd>')
        } else if (formObj[prop] !== '' && $dl.hasClass('invalid')) { /* Former invalid, now valid */
          $dl.removeClass('invalid');
          $dl.find('dd + dd').remove();
        }
      }
    },
    anyInvalidInput: function(formObj) {
      var values = Object.values(formObj);

      return values.indexOf('') !== -1
    },
    showRobot: function(e) {
      var id = $(e.target).closest('button').data('robot-id');
      var robot = this.robots.find(id);

      $main.hide();
      $forms.html(templates['show'](robot));
    },
    editRobot: function(e) {
      e.preventDefault();
      var formObj = getFormObject(e);

      if (this.anyInvalidInput(formObj)) { 
        this.displayInvalidImputs(formObj);
      } else {
        var id = parseInt(formObj['id']);
        
        this.robots.edit(id, formObj);
        this.updateManufacturersFilter();
        this.displayRobots();
        this.hideForm()
      }
    },
    destroyRobot: function(e) {
      var id = $(e.target).closest('button').data('robot-id');
      
      this.robots.remove(id);
      this.updateManufacturersFilter();
      this.hideForm();
      this.displayRobots();
    },
    displayRobotCreationForm: function() {
      this.prepareForm();

      $forms.html(templates['create']());
    },
    displayEditForm: function(e) {
      var id = $(e.target).closest('button').data('robot-id');
      var robot = this.robots.find(id);

      this.prepareForm();
      $forms.html(templates['edit'](robot));
    },
    displayRobots: function() {
      var robots = this.robots.getSelectedRobots(this.displayParams.params);

      $robots.html(Handlebars.compile(templates['robots']({robots: robots})));
      this.displayParams.displayPagination();
    },
    prepareForm: function(id) {
      $main.hide();
    },
    hideForm: function() {
      $forms.html('');
      $main.show();
    },
    updateManufacturersFilter: function() {
      var $ul = $('#filter').find('ul');
      var self = this;

      $ul.html(templates['manufacturers']({ manufacturers: self.robots.manufacturers() }));
    },
  }


  robotsApp.init();
});
