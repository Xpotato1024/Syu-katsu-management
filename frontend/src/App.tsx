import { type FormEvent, useEffect } from "react"
import "./App.css"
import { apiBase, logoutURL } from "./constants"
import { AgendaView } from "./components/AgendaView"
import { AppShell } from "./components/AppShell"
import { CompaniesView } from "./components/CompaniesView"
import { TimelineView } from "./components/TimelineView"
import { useCompanyManagement } from "./hooks/useCompanyManagement"
import { useNavigation } from "./hooks/useNavigation"
import { useTimeline } from "./hooks/useTimeline"
import { useViewer } from "./hooks/useViewer"

export function App() {
  const viewer = useViewer({ apiBase })
  const navigation = useNavigation()
  const companies = useCompanyManagement({ apiBase })
  const timeline = useTimeline({ companies: companies.companies })

  useEffect(() => {
    void viewer.loadViewer()
    void companies.loadCompanies("", "")
  }, [viewer.loadViewer, companies.loadCompanies])

  function onCreateCompany(event: FormEvent) {
    event.preventDefault()
    void companies.createCompany()
  }

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault()
    void companies.applyFilter()
  }

  function onReload() {
    navigation.closeMenu()
    void viewer.loadViewer()
    void companies.loadCompanies(companies.filterName, companies.filterStatus)
  }

  return (
    <AppShell
      isMenuOpen={navigation.isMenuOpen}
      activeView={navigation.activeView}
      viewer={viewer.viewer}
      viewerError={viewer.viewerError}
      logoutURL={logoutURL}
      onToggleMenu={navigation.toggleMenu}
      onCloseMenu={navigation.closeMenu}
      onNavigate={navigation.navigateTo}
      onReload={onReload}
    >
      {navigation.activeView === "companies" && (
        <CompaniesView
          companies={companies.companies}
          loading={companies.loading}
          submitting={companies.submitting}
          savingStepID={companies.savingStepID}
          errorMessage={companies.errorMessage}
          filterName={companies.filterName}
          filterStatus={companies.filterStatus}
          nameInput={companies.nameInput}
          newCompanyStatus={companies.newCompanyStatus}
          newSteps={companies.newSteps}
          stepDraftByCompany={companies.stepDraftByCompany}
          stepEdits={companies.stepEdits}
          companyEdits={companies.companyEdits}
          expandedCompanyIDs={companies.expandedCompanyIDs}
          onFilterNameChange={companies.setFilterName}
          onFilterStatusChange={companies.setFilterStatus}
          onFilterSubmit={onFilterSubmit}
          onClearFilter={() => void companies.clearFilter()}
          onNameInputChange={companies.setNameInput}
          onNewCompanyStatusChange={companies.setNewCompanyStatus}
          onUpdateNewStep={companies.updateNewStep}
          onRemoveNewStep={companies.removeNewStep}
          onAddNewStep={companies.appendNewStep}
          onCreateCompany={onCreateCompany}
          onToggleCompanyDetail={companies.toggleCompanyDetail}
          onUpdateStepEdit={companies.updateStepEdit}
          onSaveStep={(companyID, stepID) => void companies.saveStep(companyID, stepID)}
          onUpdateCompanyEdit={companies.updateCompanyEdit}
          onApplyResearchTemplate={companies.applyResearchTemplate}
          onSaveCompanyDetail={(companyID) => void companies.saveCompanyDetail(companyID)}
          savingCompanyID={companies.savingCompanyID}
          onUpdateInlineDraft={companies.updateInlineDraft}
          onAddStepToCompany={(companyID) => void companies.addStepToCompany(companyID)}
        />
      )}

      {navigation.activeView === "timeline" && (
        <TimelineView
          timelineMonth={timeline.timelineMonth}
          onPrevMonth={timeline.prevMonth}
          onNextMonth={timeline.nextMonth}
          onResetMonth={timeline.resetMonth}
          calendarCompanyFilter={timeline.calendarCompanyFilter}
          onCalendarCompanyFilterChange={timeline.setCalendarCompanyFilter}
          onClearCalendarCompanyFilter={timeline.clearCalendarCompanyFilter}
          calendarFilteredCompanies={timeline.calendarFilteredCompanies}
          companiesCount={companies.companies.length}
          hasScheduledSteps={timeline.hasScheduledSteps}
          hasScheduledStepsForFilteredCompanies={timeline.hasScheduledStepsForFilteredCompanies}
          timelineDays={timeline.timelineDays}
          stepsByCompanyDay={timeline.stepsByCompanyDay}
        />
      )}

      {navigation.activeView === "agenda" && (
        <AgendaView
          timelineMonth={timeline.timelineMonth}
          onPrevMonth={timeline.prevMonth}
          onNextMonth={timeline.nextMonth}
          onResetMonth={timeline.resetMonth}
          calendarCompanyFilter={timeline.calendarCompanyFilter}
          onCalendarCompanyFilterChange={timeline.setCalendarCompanyFilter}
          onClearCalendarCompanyFilter={timeline.clearCalendarCompanyFilter}
          agendaEvents={timeline.agendaEvents}
          agendaGroups={timeline.agendaGroups}
          calendarFilteredCompanyCount={timeline.calendarFilteredCompanies.length}
          companiesCount={companies.companies.length}
        />
      )}
    </AppShell>
  )
}
