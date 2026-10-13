Software Engineering Assignment 2\
Group CS3\
Dushanbe Innovation Institute \| 9 October 2026

## 1 Project purpose and scope

The University App brings academic information and university updates
into one mobile application. Students can check their classes, upcoming
assignments, news, events, notifications, and personal information. The
planned client uses Flutter and Dart, with Firebase as the backend.

## 2 Requirement gathering

The requirements were gathered through document analysis of the Home
Page technical specification and Profile Page technical documentation,
together with inspection of the hand-drawn Home screen. These sources
identify the main screens, data fields, expected behavior, and error
handling. No interviews or questionnaire results are claimed in this
report.

The requirements were grouped by feature and checked for consistency.
Student workflows are described in the supplied documents. Teacher and
administrator responsibilities below are proposed to explain who
maintains the information and require stakeholder confirmation.

  **Stakeholder**               **Needs and responsibilities**
  ----------------------------- --------------------------------------------------------------------------------------------------------------
  Student                       View academic information, manage personal settings, receive updates, and find university contacts.
  Teacher                       View teaching schedule. Proposed: create and update assignments for assigned courses and groups.
  Administrator                 Manage the DII contact directory. Proposed: maintain schedules, news, events, and official academic records.
  Project team and supervisor   Review scope, resolve conflicting requirements, and verify acceptance criteria.

## 3 Scope decisions and assumptions

For this model, the main navigation follows the Home specification:
Home, Schedule, Chat, and Profile. Contact search is accessible through
Contact DII. The Profile specification instead lists Search, Home, and
Profile; this difference must be confirmed before implementation.

Chat is a planned navigation destination, but its detailed behavior is
outside this model. Grades and GPA are read-only for students. Firebase
Authentication, Firestore, and Cloud Storage are proposed service
mappings; the documents specify Firebase but not every deployment
detail.

# 4 Functional Requirements

Each requirement states observable system behavior. Proposed management
requirements are marked explicitly.

  **ID**   **The system shall**
  -------- ----------------------------------------------------------------------------------------------------------------------------------------------
  FR01     Allow authenticated users to access their information and confirm logout before clearing the session.
  FR02     Show the user's first name, current date, and today's classes sorted by start time, including course, teacher, time, and room.
  FR03     Show incomplete assignments sorted by nearest deadline, exclude submitted work, and open list and detail pages.
  FR04     Show the latest university news from newest to oldest and provide access to news details.
  FR05     Show upcoming events with date, time, and location, excluding past events.
  FR06     Open notifications and show an unread indicator when unread notifications exist.
  FR07     Display the student's identity, academic details, contact details, GPA, and a link to the grade report.
  FR08     Allow changes to theme, language, username, and photo; validate input and save changes before confirming success.
  FR09     Require the current password before accepting a password change. Never return a stored password to the interface.
  FR10     Search DII contacts by name, email, phone, or username and provide call and email actions.
  FR11     Provide loading, empty, and error states, retry on loading failures, and pull-to-refresh for Home information.
  FR12     Proposed: allow teachers to manage assignments only for their assigned courses and groups.
  FR13     Allow administrators to maintain DII contacts. Proposed: authorize staff to maintain schedules, news, events, and official academic records.

## Business rules

BR01: Students cannot directly edit their GPA, grades, group, or
official student ID.\
BR02: Usernames must be unique. Invalid updates must not replace saved
values.\
BR03: A submitted assignment is omitted from the student's
incomplete-work list.\
BR04: Canceling logout keeps the session active. Unsaved changes require
a save or discard decision.

# 5 Quality and Acceptance Requirements

  **ID**   **Quality requirement and check**
  -------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  NFR01    Performance: the Profile header should appear within 1--2 seconds on a normal connection, as specified in the Profile document. Define the test device and network before measurement.
  NFR02    Security: enforce access permissions in backend rules as well as in the interface; protect private profiles and grades. Encrypted communication is a proposed design requirement.
  NFR03    Usability: use readable text and adequately sized controls; preserve layout when users increase the device font size.
  NFR04    Localization: provide Profile labels and actions in Russian, Tajik, and English.
  NFR05    Reliability: display a useful error and retry action after a failed request; empty results must not crash the application.
  NFR06    Offline behavior: show the last-loaded profile with an offline notice when cached data exists, and disable editing until connection returns.

## Acceptance examples

  **Scenario**                                           **Expected result**
  ------------------------------------------------------ -----------------------------------------------------------------------------------
  A student opens Home with two classes today.           Only today's classes appear, ordered by start time, with teacher, room, and time.
  One assignment is submitted and two are incomplete.    Home shows the two incomplete assignments, nearest deadline first.
  A student enters an invalid or unavailable username.   The change is rejected with an appropriate error; the existing username remains.
  The student supplies the wrong current password.       The password change fails and the current account password is preserved.
  The Home request fails, then the user taps retry.      An error is shown, and retry initiates a new request.
  A student cancels the logout confirmation.             The session remains active and the user stays in the app.

## Items requiring stakeholder confirmation

Confirm the navigation structure, teacher and administrator permissions,
the source of official grades, and whether Contact DII "Write" opens an
external app. The Profile document mentions editing email and phone but
omits these controls from its settings list; this model leaves those
edits pending confirmation. Assignment submission is represented as
stored status; an in-app upload workflow is not assumed.

Traceability: the following diagrams reference these requirement IDs.
Each diagram models a selected aspect of the same University App, rather
than repeating every feature in every view.

# 6 Use Case Diagram

This diagram shows the main actors and the goals they perform within the
University App. Lines represent actor participation, not workflow order.

![](media/image1.png){width="6.8in" height="6.8in"}

Coverage: FR01--FR13. Teacher assignment management and administrator
maintenance of university content are proposed responsibilities.
"Maintain university content" covers contacts, schedules, news, events,
and official records. Shared authentication is represented once to keep
the diagram readable.

# 7 Class Diagram

This diagram models the core academic and account data. A multiplicity
of 1 means exactly one; 0..1 means optional; 0..\* means zero or many.

![](media/image2.png){width="6.8in" height="6.8in"}

Coverage: FR02, FR03, FR06--FR08. A User may have one StudentProfile;
other user roles need not have one. Each profile has one Settings object
and may have many Submissions. Each submission belongs to one assignment
and one student. A course contains assignments and scheduled classes.
News, Event, Grade, and DIIContact are additional entities outside this
core view; their fields follow the supplied specifications.
Authentication credentials are managed separately, not stored in
StudentProfile.

# 8 Sequence Diagram

Scenario: a signed-in student updates ordinary profile settings. The
diagram shows messages in time order from top to bottom. The alt
fragment separates invalid and valid input paths.

![](media/image3.png){width="6.8in" height="6.8in"}

Coverage: FR08 and NFR02. Profile service represents the application's
settings logic. The database applies authorization rules; uniqueness
requires an atomic check where relevant. A failed save keeps the
existing stored values and allows retry. Password changes follow FR09
through authentication and are a separate workflow.

# 9 Activity Diagram

Scenario: a student opens the incomplete assignments list. Decisions
determine whether data loads successfully and whether there are any
assignments to display.

![](media/image4.png){width="6.8in" height="6.8in"}

Coverage: FR03 and FR11. The filled circle is the start, rounded
rectangles are actions, diamonds are decisions, and the ringed circle is
completion. Guards in brackets identify each decision outcome. Retrying
returns to loading; successful results are ordered by nearest deadline.

# 10 State Diagram

This diagram describes the states of the Profile settings editor.
Transitions are labeled with events and, where needed, guards or
effects.

![](media/image5.png){width="6.8in" height="5.95in"}

Coverage: FR08 and FR11. Invalid input enters Validation error;
correcting it returns to Editing. Saving may succeed or fail. Success
returns to Viewing with saved values. Canceling discards unsaved
changes. There is no terminal state because the editor may be used
repeatedly while the screen remains open.

# 11 Component Diagram

This diagram groups the software into logical modules. User interface
components depend on repositories, which provide access to the proposed
Firebase services.

![](media/image6.png){width="6.8in" height="5.95in"}

Coverage: FR01--FR11. Home and academics includes schedule, assignments,
news, events, and notifications. Profile and settings handles profile
and preference workflows; Contact directory provides search and contact
actions. Firebase Authentication handles identity, Firestore holds
structured records, and Cloud Storage holds profile photos. Backend
authorization rules restrict access regardless of interface visibility.

# 12 Deployment Diagram

This diagram shows where the application and its services run. The
Flutter application is deployed on an iPhone inside iOS and communicates
with Firebase over the internet.

![](media/image7.png){width="6.8in" height="5.95in"}

Coverage: NFR02 and NFR06. The local device may retain the last-loaded
profile for offline viewing. Authentication, database, and photo storage
are proposed Firebase service allocations.\
\
Sources: Home Page (Technical Specification) (1).pdf;
Profile_Page_Technical_Documentation 2.docx; and the hand-drawn Home
wireframe photo_2026-09-09 12.24.39.jpeg. Supplied project documents
were reviewed on 9 October 2026.
