import React from 'react';
import ReportHeader from './ReportHeader';
import ReportTimeline from './ReportTimeline';
import ReportFinancial from './ReportFinancial';
import ReportWorkOrders from './ReportWorkOrders';
import ReportDetails from './ReportDetails';
import './ProjectReport.css';

const ProjectReport = React.forwardRef(({ reportData }, ref) => {
    if (!reportData) return null;

    const { project, metrics } = reportData;

    return (
        <div ref={ref} className="project-report">
            <div className="report-content">
                <ReportHeader project={project} />
                <ReportTimeline project={project} metrics={metrics} />
                <ReportFinancial project={project} metrics={metrics} />
                <ReportWorkOrders metrics={metrics} />
                <ReportDetails project={project} />
                
                <div className="report-footer">
                    <div className="footer-text">
                        Generated on {new Date().toLocaleString('en-US', { 
                            dateStyle: 'full', 
                            timeStyle: 'short' 
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});

ProjectReport.displayName = 'ProjectReport';

export default ProjectReport;