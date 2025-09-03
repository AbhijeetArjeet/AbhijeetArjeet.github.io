import { hash } from 'bcryptjs';
let schemaContent = "";

    // Load schema.sql file
    document.getElementById("fileInput").addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          schemaContent = event.target.result;
          document.getElementById("output").innerText = "Loaded schema.sql (" + file.name + ")";
        };
        reader.readAsText(file);
      }
    });

    function appendSQL(sql) {
      schemaContent += "\n" + sql;
      document.getElementById("output").innerText = sql;
    }

    function addPerson() {
      const name = document.getElementById("p_name").value.trim();
      const idn = document.getElementById("p_id_number").value.trim();
      const rfid = document.getElementById("p_rfid").value.trim();
      const role = document.getElementById("p_role").value;
      const pass = document.getElementById("p_id_number").value.trim(); // Default password as ID number
      const hashedPass = hash(pass, 10);
      if (!name || !idn || !rfid) { alert("Fill all fields"); return; }
      appendSQL(`INSERT INTO persons (name, id_number, rfid_tag, role, password) VALUES ('${name}', '${idn}', '${rfid}', '${role}', '${hashedPass}');`);
      alert("Person added. Please note the assigned ID for further relations.");
    }

    function addSection() {
      const s = document.getElementById("s_name").value.trim();
      if (!s) { alert("Enter section name"); return; }
      appendSQL(`INSERT INTO sections (section_name) VALUES ('${s}');`);
      alert("Section Added. Please note the assigned ID for further relations.");
    }

    function addStudentSection() {
      const pid = document.getElementById("ss_pid").value;
      const sid = document.getElementById("ss_sid").value;
      if (!pid || !sid) { alert("Enter IDs"); return; }
      appendSQL(`INSERT INTO student_sections (person_id, section_id) VALUES (${pid}, ${sid});`);
      alert("Student-Section relation added.");
    }

    function addTeacherSection() {
      const pid = document.getElementById("ts_pid").value;
      const sid = document.getElementById("ts_sid").value;
      if (!pid || !sid) { alert("Enter IDs"); return; }
      appendSQL(`INSERT INTO teacher_sections (person_id, section_id) VALUES (${pid}, ${sid});`);
      alert("Teacher-Section relation added.");
    }

    function addClassroom() {
      const r = document.getElementById("c_room").value.trim();
      if (!r) { alert("Enter room number"); return; }
      appendSQL(`INSERT INTO classrooms (room_number) VALUES ('${r}');`);
      alert("Classroom added. Please note the assigned ID for further relations.");
    }

    function addSchedule() {
      const sid = document.getElementById("sch_sid").value;
      const tid = document.getElementById("sch_tid").value;
      const cid = document.getElementById("sch_cid").value;
      const day = document.getElementById("sch_day").value;
      const st = document.getElementById("sch_start").value;
      const et = document.getElementById("sch_end").value;
      if (!sid || !tid || !cid || !st || !et) { alert("Fill all fields"); return; }
      appendSQL(`INSERT INTO schedule (section_id, teacher_id, classroom_id, day_of_week, start_time, end_time) VALUES (${sid}, ${tid}, ${cid}, '${day}', '${st}', '${et}');`);
      alert("Schedule added.");
    }

    function addAttendance() {
      const pid = document.getElementById("a_pid").value;
      const cid = document.getElementById("a_cid").value;
      const ts = document.getElementById("a_time").value;
      if (!pid || !cid || !ts) { alert("Fill all fields"); return; }
      appendSQL(`INSERT INTO attendance (person_id, classroom_id, timestamp) VALUES (${pid}, ${cid}, '${ts.replace("T"," ")}');`);
      alert("Attendance record added.");
    }

    function downloadFile() {
      const blob = new Blob([schemaContent], { type: "text/sql" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "schema.sql";
      link.click();
    }