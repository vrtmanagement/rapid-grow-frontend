import React from 'react';
import { WorkspaceProject } from '../../types';

interface WorkspaceP1CharterSectionsProps {
  activeProject: WorkspaceProject;
  updateProject: (updates: Partial<WorkspaceProject>) => void;
}

const WorkspaceP1CharterSections: React.FC<WorkspaceP1CharterSectionsProps> = ({
  activeProject,
  updateProject,
}) => {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-brand-navy mb-2">Business Case</h2>
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <textarea
            value={activeProject.businessCase}
            onChange={e => updateProject({ businessCase: e.target.value })}
            className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[80px]"
            placeholder="Describe the business case for this project..."
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-brand-navy mb-2">
          Problem / Opportunity Statement
        </h2>
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <textarea
            value={activeProject.problemStatement}
            onChange={e => updateProject({ problemStatement: e.target.value })}
            className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[80px]"
            placeholder="Summarize the core problem or opportunity..."
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-brand-navy mb-2">
          Goal / Objective / Key Results
        </h2>
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <textarea
            value={activeProject.goalStatement}
            onChange={e => updateProject({ goalStatement: e.target.value })}
            className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[100px]"
            placeholder={'Goal:\nObjective:\nKey Results:'}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-brand-navy mb-2">Project Scope</h2>
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
            <div className="text-[13px] font-semibold text-slate-700 mb-1">In Scope</div>
            <textarea
              value={activeProject.inScope}
              onChange={e => updateProject({ inScope: e.target.value })}
              className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[60px]"
              placeholder="Items and activities included within this project..."
            />
          </div>
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
            <div className="text-[13px] font-semibold text-slate-700 mb-1">Out of Scope</div>
            <textarea
              value={activeProject.outOfScope}
              onChange={e => updateProject({ outOfScope: e.target.value })}
              className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[60px]"
              placeholder="Items and activities explicitly excluded from this project..."
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-brand-navy mb-2">
          Project Benefits / Revenue
        </h2>
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <textarea
            value={activeProject.benefits}
            onChange={e => updateProject({ benefits: e.target.value })}
            className="w-full bg-transparent border-none text-brand-grey text-[15px] leading-relaxed outline-none resize-none min-h-[80px]"
            placeholder="Describe expected benefits and revenue impact..."
          />
        </div>
      </section>
    </div>
  );
};

export default WorkspaceP1CharterSections;
