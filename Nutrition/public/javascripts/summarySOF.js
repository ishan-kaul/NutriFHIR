//Global variable
var meds=[]
var pat_addr;
var height_plot_data;
var weight_plot_data;
var bmi_plot_data;
var glucose_plot_data;
var hba1c_plot_data;
var bp_plot_data;
var totChol_plot_data;
var hdl_plot_data;
var ldl_plot_data;
var encounterId_Locations = {};

/* Required Smart on Fhir On Ready Function */
function onReady(smart) {
  var patient = smart.patient;
  var pt = patient.read();
  var obv = smart.patient.api.fetchAll({

    // Note - I don't know how to sort results by time or anything. Someone
    // should figure that out
    type: 'Observation',
    query: {
      code: {
        $or: ['http://loinc.org|3141-9', // Body weight measured
              'http://loinc.org|8302-2', // Body height
              'http://loinc.org|39156-5', // BMI
              'http://loinc.org|14647-2',//Cholesterol in serum(moles/volume)
              'http://loinc.org|2093-3',//Cholesterol in serum(mass/volume)
              'http://loinc.org|4548-4',//Hba1c
              'http://loinc.org|2085-9',//HDL
              'http://loinc.org|13457-7',//LDL
			  'http://loinc.org|2345-7', // Glucose in Serum/Plasma
			  'http://loinc.org|8480-6', // Systolic Blood Pressure
			  'http://loinc.org|8462-4', // Diastolic Blood Pressure
            ]
      }
    }

  });
  var isDiabetic = 0;
  var hasHypertension = false;

  var cond = smart.patient.api.search({type: 'Condition'});
  //var meds = smart.patient.api.search({type: 'MedicationOrder'});
  //var allMeds = smart.patient.api.search({type: 'MedicationStatement'})

  //var allergies = smart.patient.api.search({type: 'AllergyIntolerance'});



  // /* Generate Medication List */
  smart.patient.api.fetchAllWithReferences({type: "MedicationStatement"}).then(function(results) {
    id = 0;

   //Trying timeline concept
   results.forEach(function(statement){
     console.log(statement)
     item = {}

     try{
     item.id =  id
     if(statement.effectivePeriod){
     item.start =  new Date(statement.effectivePeriod.start).toLocaleDateString()
     if(statement.effectivePeriod.end)
        {
        item.end = new Date(statement.effectivePeriod.end).toLocaleDateString()
        item.type = 'range'
        }
        }
     else{
      item.start = new Date(statement.effectiveDateTime).toLocaleDateString()
      }

      if(!item.type){
        item.type = 'point'
      }

      if(statement.medicationCodeableConcept.coding){
        item.content = statement.medicationCodeableConcept.coding[0].display
      }
      else{
        item.content = statement.medicationCodeableConcept.text
      }

     if(statement.dosage[0].route){
     item.route = statement.dosage[0].route.text
      }

    if(statement.dosage[0].quantityQuantity){
     item.dosageQuantity = statement.dosage[0].quantityQuantity.value +" "+statement.dosage[0].quantityQuantity.unit
    }

    item.status = statement.status
    if(item.status == 'active'){
      item.sflag = 'active'
      item.className = 'active'
    }
    else{
      item.sflag = 'inactive'
      item.className = 'inactive'
    }
    if(statement.informationSource){
      item.source = statement.informationSource.display
      if(statement.informationSource.reference){
        if(statement.informationSource.reference.split("/")[0] = "Practitioner")
        {
          item.reference = statement.informationSource.reference
          item.flag = 'prac'
        }
        else{
          item.reference = statement.informationSource.reference
          item.flag ='pat'
        }
      }
    }

    else{
      item.reference = 'Patient'
      item.flag = 'pat'
    }


    //format tooltip dispalay
    item.title = '<b>Medication</b> : '+item.content+'<br>'+
                 '<b>Reference</b> : '+item.reference+'<br>'+
                 '<b>Source</b> : '+item.source+'<br>'+
                 '<b>Status</b> : '+item.status+'<br>'+
                 '<b>Route</b> : '+item.route+'<br>'+
                 '<b>Dose</b> : '+item.dosageQuantity+'<br>'+
                 '<b>Start</b> : '+item.start+'<br>'+
                 '<b>End</b> : '+item.end+'<br>'
    }


    catch (e){
      console.log(e)
    }

    //console.log(item)
    console.log(item)
    meds.push(item)
    id =id +1;

     });

    console.log(meds)
     //Build timeline
     var cap_options = {
         tooltip: {
         followMouse: true,
         overflowMethod: 'cap'
       },
       maxHeight : '400px',
       minHeight : '400px'
     }


     var container = document.getElementById('tooltips')
     var items = new vis.DataSet(meds)
     var options = {
       maxHeight : '400px'
     }


     var toolT = new vis.Timeline(document.getElementById('tooltips'),items, cap_options);
     //var Timeline = new vis.Timeline(container,items,options)

     //Event handler for radio buttons
     $(function(){
       $("[name=filter]").change(function(){

          $('#statusCheck').prop('checked',false)

          if($(this).attr("id") == 'prac'){
            update_timeline('prac',"visible",items)
            update_timeline('pat',"hide",items)
            console.log(items)
          }

          else if($(this).attr("id") == 'pat'){
            update_timeline('pat',"visible",items)
            update_timeline('prac',"hide",items)
            //console.log(items)
          }

          else{
            update_timeline('all',"visible",items)
          }


          });

          /*Checkbox*/

          $('#statusCheck').change(function() {

          chosenRadio = $('input[name=filter]:checked').attr('id');

          if(this.checked){
            items.forEach(function(each){
                if(each.sflag == 'inactive' && each.flag == chosenRadio){
                  console.log(each.flag,each.sflag,each.className)
                  items.update({id : each.id , className : "hide "+each.status})
                }
                else if(each.sflag == 'inactive' && chosenRadio == 'all'){
                  console.log(each.flag,each.sflag,each.className)
                  items.update({id : each.id , className : "hide "+each.status})
                }
            })
          }

          if(!this.checked){
            items.forEach(function(each){
                if(each.sflag == 'inactive' && each.flag == chosenRadio){
                  console.log(each.flag,each.sflag,each.className)
                  items.update({id : each.id , className : "visible "+each.status})
                }
                else if(each.sflag == 'inactive' && chosenRadio == 'all'){
                  console.log(each.flag,each.sflag,each.className)
                  items.update({id : each.id , className : "visible "+each.status})
                }
            })
          }

          });

     })



   });


   /*Update function*/
function update_timeline(selection,action,tItems){
  if(selection == 'prac' || selection == 'pat'){
   tItems.forEach(function(each){
         if(each.flag == selection){
           tItems.update({id : each.id, className : action+" "+each.status})
                        }
          selected = selection
        })
  }
  else{
    tItems.forEach(function(each){
            tItems.update({id : each.id, className : action+" "+each.status})
           selected = selection
         })
  }
}

  /* Go through encounters */
  console.log('on encounters');
  smart.patient.api.fetchAllWithReferences({type: "Encounter"}).then(function(results) {
    results.forEach(function(statement){
      encounterId_Locations[statement.id] = statement['location'][0]['location']['display'];
    });
  });

  console.log(encounterId_Locations);



  /* Generate Problem List */
  smart.patient.api.fetchAllWithReferences({type: 'Condition'}).then(function(results) {
   results.forEach(function(condition){
	if (condition.code.text !== "Entered In Error" && condition.category.text == "Problem") {
          //$("#problems-list").append("<p>" + condition.code.text + "</p>");
	}
	if (condition.code.text.toLowerCase().indexOf("diabetes") >= 0) {
	  //console.log("Has diabetes");
	  isDiabetic += 1;
	}
     });
   });

  /* Generate Allergy List */
  /*
  smart.patient.api.fetchAllWithReferences({type: 'AllergyIntolerance'}).then(function(results) {
   results.forEach(function(allergy){
	if (allergy.substance.coding) {
          $("#allergies-list").append("<p>" + allergy.substance.text + "</p>");
	}
     });
   });*/

  $.when(pt, obv, cond, meds).fail(onError);
  $.when(pt, obv, cond, meds).done(
    function(patient, obv, conditions, prescriptions) {
      console.log(patient);
      // console.log(obv);
      // console.log(conditions);
      // console.log(prescriptions);
      // console.log(allergies);

      /* Get Name */
      var fname = '';
      var lname = '';
      if(typeof patient.name[0] !== 'undefined') {
        fname = patient.name[0].given.join(' ').toLowerCase();
        lname = patient.name[0].family.join(' ').toLowerCase();
      }

      $("#Patient_Name").text(
        titleCase(fname) + ' ' + titleCase(lname)
      );

      /* Get Patient Gender */
      $("#gender_text").text(
        titleCase(patient['gender'])
      );

      /* Hispanic or Latino? */

      $("#hisp_or_lat_text").text(patient['extension'][1]['extension'][1].valueString);


      /* Get Patient Marital Status */
      $("#married_text").text(
        titleCase(patient['maritalStatus'].text)
      );


      /* Get Patient Birth Date and Age*/
      var dob = new Date(patient['birthDate']);
      var day = dob.getDate();
      var monthIndex = dob.getMonth() + 1;
      var year = dob.getFullYear();

      var today = new Date();
      var age = today.getFullYear() - year;
      if (today.getMonth() < monthIndex || (today.getMonth() == monthIndex && today.getDate() < day)) {
          age--;
      }

      if (day < 10) {
        day = '0' + day;
      }
      if (monthIndex < 10) {
        monthIndex = '0' + monthIndex;
      }

      var dobStr = monthIndex + "/" + day + '/' + year;
      //console.log(dobStr);

      $("#dob_age_text").text(dobStr + " (" + age + "Y)");


      /* Get Patient Address */
      var adr = patient['address'][0]['line'][0];
      var city = patient['address'][0].city;
      var state = patient['address'][0].state;
      var fullAddress = adr + ", " + city + ", " + state;
      $("#addr_text").text(
        (fullAddress)
      );

      function normalize(phone) {
        //normalize string and remove all unnecessary characters
        phone = phone.replace(/[^\d]/g, "");
        //check if number length equals to 10
        if (phone.length == 10) {
            //reformat and return phone number
            return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1)-$2-$3");
        }
        return null;
      }
      var phoneNum = patient['telecom'][0]['value'];
      phoneNum = normalize(phoneNum);

      $("#home_phone_text").text(
        (phoneNum)
      );

      /* Print statuses for diabetes and hypertension */
      console.log("Diabetes: " + isDiabetic);
      if (isDiabetic > 0) {
	       $("#has-diabetes").text("Yes");
      }
      else {
	       $("#has-diabetes").text("No");
      }

      if (hasHypertension) {
	       $("#has-hypertension").text("Yes");
      }
      else {
	       $("#has-hypertension").text("No");
      }

      /* Get Weight */
      var byCodes = smart.byCodes(obv, 'code');
      var weight = byCodes('3141-9');
      $("#weight-text").text(getQuantityValueAndUnit(weight[0]));

      /* Get Height */
      var height = byCodes('8302-2');
      $("#height-text").text(getQuantityValueAndUnit(height[0]));

      /* Get BMI */
      var BMI = byCodes('39156-5');
      $("#bmi-score").text(getQuantityValueAndUnit(BMI[0]));
      colorField("#bmi-score", BMI[0]);

      /*Get Cholesterol(moles/volume) in Serum*/
      var cholesterol = byCodes('14647-2')

      /*Get total HBA1C*/
      var hba1c = byCodes('4548-4')
      $("#hba1c-score").text(getQuantityValueAndUnit(hba1c[0]));
      colorField("#hba1c-score", hba1c[0]);

      /*Get total cholesterol*/
      var chol = byCodes('2093-3')
      $("#chol").text(getQuantityValueAndUnit(chol[0]))
      console.log(obv)
      colorField("#chol", chol[0]);

      /*Get HDL*/
      var hdl = byCodes('2085-9')
      $("#hdl-score").text(getQuantityValueAndUnit(hdl[0]))
      colorField("#hdl-score", hdl[0]);

      /*Get HDL*/
      var ldl = byCodes('13457-7')
      $("#ldl-score").text(getQuantityValueAndUnit(ldl[0]))
      colorField("#ldl-score", ldl[0]);

      /*Get Glucose [Mass/volume] in serum or plasma*/
      var gluc = byCodes('2345-7')
      $("#gluc-score").text(getQuantityValueAndUnit(gluc[0]))
      colorField("#gluc-score", gluc[0]);

      /*Get Systolic Blood Pressure*/
      var sbp = byCodes('8480-6')
      $("#sbp-text").text(getQuantityValueAndUnit(sbp[0]))
      colorField("#sbp-text", sbp[0]);

      /*Get Diastolic Blood Pressure*/
      var dbp = byCodes('8462-4')
      $("#dbp-text").text(getQuantityValueAndUnit(dbp[0]))
      colorField("#dbp-text", dbp[0]);

	  var address = fullAddress;
      var queryType = "Groceries";
      pat_addr = fullAddress;

	  /* Fill out all plot data global variables we will use */
	  height_plot_data = populatePlotData(height, false);
	  weight_plot_data = populatePlotData(weight, false);
	  bmi_plot_data = populatePlotData(BMI, true);
	  glucose_plot_data = populatePlotData(gluc, true);
	  hba1c_plot_data = populatePlotData(hba1c, true);
	  bp_plot_data = populatePlotData({}, true);
	  totChol_plot_data = populatePlotData(chol, true);
	  hdl_plot_data = populatePlotData(hdl, true);
	  ldl_plot_data = populatePlotData(ldl, true);

    }
  )
}

/* Required On Error function */
function onError() {
  console.log('Loading error', arguments);
}

/* Helper function to populate the structs we need for the deepdive cards */
function populatePlotData(data, needColor) {
	td = {Value: [], Date: [], Method: [], Location: [], headers: [], colors: []};
	gd = {values: [], refHi: [], refLo: [], dates: [], units: []};

	for(i = 0; i < data.length; i++) {

		/* Push Table Data */
		td['Value'].push(getQuantityValueAndUnit(data[i]));
		var tDate = getDate(data[i]);
		td['Date'].push(tDate.substring(0,10));
		
		if(needColor) {
			td['colors'].push(getColor(data[i])[1]);
		}
		else {
			td['colors'].push('none');
		}

		// Use our encounter dictionary to find out where the encounter occured
		var encounter_num = parseInt(data[i]['encounter']['reference'].replace('Encounter/', ''));
		td['Location'].push(encounterId_Locations[encounter_num]);

		// Try to get method
		td['Method'].push(getMethod(data[i]));

		/* Push Graph Data */
		gd['values'].push(getValue(data[i]));
		gd['refHi'].push(getRefHi(data[i]));
		gd['refLo'].push(getRefLo(data[i]));
		gd['dates'].push(new Date(tDate));
		gd['units'].push(getUnits(data[i]));
	}

	td['headers'] = ['Value', 'Date', 'Method', 'Location'];
	console.log(td);
	return {tableData: td, graphData: gd};
}

/* Helper Function To Convert Lower-case words to Upper Case First letter */
function titleCase(str) {
  var splitStr = str.toLowerCase().split(' ');
  for(var i = 0; i < splitStr.length; i++) {
    splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(' ');
}

/* Helper Function to Check If Leap Year - Needed To Get Age */
function isLeapYear(year) {
    return new Date(year, 1, 29).getMonth() === 1;
}

/* Helper Function to Calculate Age */
function calculateAge(date) {
  if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
    var d = new Date(date), now = new Date();
    var years = now.getFullYear() - d.getFullYear();
    d.setFullYear(d.getFullYear() + years);
    if (d > now) {
      years--;
      d.setFullYear(d.getFullYear() - 1);
    }
    var days = (now.getTime() - d.getTime()) / (3600 * 24 * 1000);
    return years + days / (isLeapYear(now.getFullYear()) ? 366 : 365);
  }
  else {
    return undefined;
  }
}

/* Helper Function to Get Method of Observation */
function getMethod(ob) {
	if (typeof ob != 'undefined' &&
		typeof ob.method != 'undefined') {
			return ob.method;
	} else {
		return '-'
	}
}

/* Helper Function to Get Quantity Value/Units for a Given Observation */
function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
      typeof ob.valueQuantity != 'undefined' &&
      typeof ob.valueQuantity.value != 'undefined' &&
      typeof ob.valueQuantity.unit != 'undefined') {
        return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
  } else {
    return '-';
  }
}  
 
/* Helper function to get value */   
function getValue(ob) { 
	if(typeof ob != 'undefined' &&
	   typeof ob.valueQuantity != 'undefined' &&
	   typeof ob.valueQuantity.value != 'undefined') {
		   return ob.valueQuantity.value;        
   } else {  
	   return undefined;  
   }             
}

/* Helper function to get dates */
function getDate(ob) {
	if(typeof ob != 'undefined' &&
	   typeof ob.effectiveDateTime != 'undefined') {
			return ob.effectiveDateTime;
    } else {
		return undefined;
	}
}

/* Helper function to get refHi */
function getRefHi(ob) {
	if(typeof ob != 'undefined' &&
	   typeof ob.referenceRange != 'undefined' &&
	   typeof ob.referenceRange[0] != 'undefined' &&
	   typeof ob.referenceRange[0].high != 'undefined' &&
	   typeof ob.referenceRange[0].high.value != 'undefined') {
		   return ob.referenceRange[0].high.value;
   } else {
	   return undefined;
   }
}

/* Helper function to get reflo */
function getRefLo(ob) {
	if(typeof ob != 'undefined' &&
	   typeof ob.referenceRange != 'undefined' &&
	   typeof ob.referenceRange[0] != 'undefined' &&
	   typeof ob.referenceRange[0].low != 'undefined' &&
	   typeof ob.referenceRange[0].low.value != 'undefined') {
		   return ob.referenceRange[0].low.value;
   } else {
	   return undefined;
   }
}

/* Helper function to get units */
function getUnits(ob) {
	if(typeof ob != 'undefined' &&
	   typeof ob.valueQuantity != 'undefined' &&
	   typeof ob.valueQuantity.code != 'undefined') {
		   return ob.valueQuantity.code;
   } else { 
	   return undefined;
   }
}   
   
function getColor(ob) {
  if (typeof ob != 'undefined' &&
      typeof ob.valueQuantity != 'undefined' &&
      typeof ob.valueQuantity.value != 'undefined' &&
      typeof ob.referenceRange != 'undefined' &&
      typeof ob['referenceRange'][0]['high'] != 'undefined' &&
      typeof ob['referenceRange'][0]['high']['value'] != 'undefined' &&
      typeof ob['referenceRange'][0]['low'] != 'undefined' &&
      typeof ob['referenceRange'][0]['low']['value'] != 'undefined')

  {
        var color = d3.scale.linear().domain([ob['referenceRange'][0]['low']['value'], ob['referenceRange'][0]['high']['value']])
			.interpolate(d3.interpolateHcl)
			.range([d3.rgb('#4CBB17'), d3.rgb("#C21807")]);

		if (ob.valueQuantity.value > ob['referenceRange'][0]['high']['value']) {
		  var value_color = color(ob['referenceRange'][0]['high']['value']);
		}
		else if (ob.valueQuantity.value < ob['referenceRange'][0]['low']['value']) {
		  var value_color = color(ob['referenceRange'][0]['low']['value']);
		}
		else {
		  var value_color = 'none';//color(ob.valueQuantity.value);
		}
		return [true, value_color];
  }
  else {
	return [false, "#000000"]
  }
}

/* Helper Function to color Observation value appropriately (assumes lower is better, green is good and red is bad)*/
function colorField(fieldID, ob) {
	var value_color = getColor(ob);
	if(value_color[0]) {
		d3.select(fieldID).style("color", value_color[1]);
	} else {
		console.log("not coloring " + fieldID);
		if (typeof ob != 'undefined') {
		  console.log(typeof ob.referenceRange[0]['high']);
		}
	}
}

/* Helper Functions to Generate Medication List From Search Results for MedicationOrders */
function getMedicationName (medCodings) {
  var coding = medCodings.find(function(c){
    return c.system == "http://www.nlm.nih.gov/research/umls/rxnorm";
  });

  return coding && coding.display || "Unnamed Medication(TM)"
}

function displayMedication (medCodings) {
  $("#med-list").append("<p>" + getMedicationName(medCodings) + "</p>");
}

/*Define toggler function for the dropdown*/
function toggler(divId) {
    $("#" + divId).toggle();
}

/*Draw Spider Chart for a given set of scores in the target div*/
function drawSpider(target,scores){

  Highcharts.chart(target, {

    chart: {
        polar: true,
        type: 'line'
    },

    title: {
        text: 'Nutrition Score Comoponents',
        x: -80
    },

    xAxis: {
        categories: ['Fruits', 'Vegetables', 'Grains', 'Dairy',
                'Protein Foods', 'Fats', 'Refined Grains', 'Sodium', 'Empty Calories'],
        tickmarkPlacement: 'on',
        lineWidth: 0
    },

    yAxis: {
        gridLineInterpolation: 'polygon',
        lineWidth: 0,
        min: 0,
        max: 20
    },

    tooltip: {
        shared: true,
    },

    legend: {
        align: 'center',
        verticalAlign: 'top',
        layout: 'horizontal'
    },
    series : scores
})};

/*Fake data for spider chart*/
test= [
  {
    name: 'Purchase period 1',
    data: [1,5, 10, 3, 1, 4, 6,8,19],
    pointPlacement: 'on'
},
{
    name: 'Purchase period 2',
    data: [1,6, 3, 10, 5, 8, 3,2,12],
    pointPlacement: 'on'
},
{
    name: 'Purchase period 3',
    data: [9,9, 8, 10, 6, 9, 7,8,7],
    pointPlacement: 'on'
},
{
    name: 'Reference',
    data: [10,10, 10, 10, 10, 10, 10,10,20],
    //pointPlacement: 'on'
}
];

/*Draw charts that are independant of FHIR calls*/
window.onload=function() {
  //document.getElementById("nutrient-score").innerHTML = 42;//Cuz, answer to everything
  //drawSpider("progress-chart",test)
}

/*Draw line graph*/
function drawGraph(target,title,measurement,rangehigh,rangelow,xtitle,ytitle,min,max){

  series = [{name : xtitle,data:[]}]
  measurement.forEach(function(measurement){
    date = new Date(measurement.meta.lastUpdated)
    formattedDate = Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())
    series[0].data.push([formattedDate,measurement.valueQuantity.value])
  })
  //console.log(series)

  Highcharts.chart(target,{

    title : {text : title, x: -80},
    xAxis: {
        type: 'datetime',
        tickInterval : 6 * 30 * 24 * 365
    },
      yAxis :{
      min : min,
      max : max,
      plotBands : [{
          from: rangelow, // Start of the plot band
          to: rangehigh, // End of the plot band
          color: 'rgba(68, 170, 213, 0.1)', // Color value
          label : {text : 'Reference region', style : { color : '#606060'}}
        }],
      title:{ text : ytitle}

        },
    series : series

    })
}
