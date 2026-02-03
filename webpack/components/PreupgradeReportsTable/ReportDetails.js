import React from 'react';
import PropTypes from 'prop-types';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import { translate as __ } from 'foremanReact/common/I18n';
import './PreupgradeReportsTable.scss';

export const renderSeverityLabel = severity => {
  switch (severity) {
    case 'high':
      return <Label color="red">{__('High')}</Label>;
    case 'medium':
      return <Label color="orange">{__('Medium')}</Label>;
    case 'low':
      return <Label color="blue">{__('Low')}</Label>;
    case 'info':
      return <Label color="grey">{__('Info')}</Label>;
    default:
      return <Label color="grey">{severity || __('Info')}</Label>;
  }
};

const ReportDetails = ({ entry }) => (
  <DescriptionList isHorizontal isCompact className="leapp-report-details">
    {entry.title && (
      <DescriptionListGroup>
        <DescriptionListTerm>{__('Title')}</DescriptionListTerm>
        <DescriptionListDescription>{entry.title}</DescriptionListDescription>
      </DescriptionListGroup>
    )}

    {entry.severity && (
      <DescriptionListGroup>
        <DescriptionListTerm>{__('Risk Factor')}</DescriptionListTerm>
        <DescriptionListDescription>
          {renderSeverityLabel(entry.severity)}
        </DescriptionListDescription>
      </DescriptionListGroup>
    )}

    {entry.summary && (
      <DescriptionListGroup>
        <DescriptionListTerm>{__('Summary')}</DescriptionListTerm>
        <DescriptionListDescription>{entry.summary}</DescriptionListDescription>
      </DescriptionListGroup>
    )}

    {entry.tags && entry.tags.length > 0 && (
      <DescriptionListGroup>
        <DescriptionListTerm>{__('Tags')}</DescriptionListTerm>
        <DescriptionListDescription>
          <LabelGroup>
            {entry.tags.map((tag, i) => (
              <Label key={`label-${i}`} color="blue">
                {tag}
              </Label>
            ))}
          </LabelGroup>
        </DescriptionListDescription>
      </DescriptionListGroup>
    )}

    {entry.detail?.external?.map((item, i) => (
      <DescriptionListGroup key={`external-${i}`}>
        <DescriptionListTerm>{__('Links')}</DescriptionListTerm>
        <DescriptionListDescription>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </DescriptionListDescription>
      </DescriptionListGroup>
    ))}

    {entry.detail?.remediations?.map((item, i) => (
      <DescriptionListGroup key={`remediations-${i}`}>
        <DescriptionListTerm>
          {item.type === 'command' ? __('Command') : __('Hint')}
        </DescriptionListTerm>
        <DescriptionListDescription>
          {item.type === 'command' ? (
            <code>
              {Array.isArray(item.context)
                ? item.context.join(' ')
                : item.context}
            </code>
          ) : (
            item.context
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);

ReportDetails.propTypes = {
  entry: PropTypes.shape({
    title: PropTypes.string,
    severity: PropTypes.string,
    summary: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    detail: PropTypes.shape({
      external: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          title: PropTypes.string,
        })
      ),
      remediations: PropTypes.arrayOf(
        PropTypes.shape({
          type: PropTypes.string,
          context: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.arrayOf(PropTypes.string),
          ]),
        })
      ),
    }),
  }).isRequired,
};

export default ReportDetails;
